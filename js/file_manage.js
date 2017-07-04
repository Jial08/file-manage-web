// 文件上传
jQuery(function() {
    var $ = jQuery,
        $list = $('#thelist'),
        $btn = $('#ctlBtn'),
        state = 'pending',
        // window.devicePixelRatio是设备上物理像素和设备独立像素(device-independent pixels (dips))的比例。
        ratio = window.devicePixelRatio || 1,
        // 设置图片缩略图大小
        thumbnailWidth = 100 * ratio,
        thumbnailHeight = 100 * ratio,
        uploader,
        chunkSize = 5 * 1024 * 1024; // 上传分块儿大小

    // WebUploader的hook接口
    WebUploader.Uploader.register({
        // 在文件发送之前执行，用文件前5M的MD5和最后修改时间来判断文件唯一性
        'before-send-file': 'preupload',
        // 在文件分片（如果没有启用分片，整个文件被当成一个分片）后，上传之前执行，用于做断点续传
        'before-send': 'checkchunk'
    }, {
        preupload: function(file) {
            var me = this,
                owner = this.owner,
                server = me.options.server,
                deferred = WebUploader.Deferred();

            owner.md5File(file, 0, chunkSize)

            // 如果读取出错了，则通过reject告诉webuploader文件上传出错。
            .fail(function() {
                deferred.reject();
            })

            // md5值计算完成
            .then(function(md5) {
                file.md5 = md5;
                var fileData = { "md5": md5, "lastModifiedDate": file.lastModifiedDate, "fileName": file.name };
                $.ajax({
                    url: "/file-manage/filemanage/checkFile",
                    type: "post",
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify(fileData),
                    success: function(data) {
                        if (data.result) {
                            // 如果文件已上传则跳过
                            owner.skipFile(file);
                            $('#' + file.id).find('p.state').text('已上传');
                        } else {
                            // 否则webuploader接着往下走
                            deferred.resolve();
                        }
                    },
                    error: function(error) {
                        deferred.resolve();
                    }
                });
            });

            return deferred.promise();
        },
        checkchunk: function(block) {
            var me = this,
                owner = this.owner,
                deferred = WebUploader.Deferred();
            owner.md5File(block.blob, block.start, block.end)
                .fail(function() { // 如果读取出错了，则通过reject告诉webuploader文件上传出错。
                    deferred.reject();
                })
                .then(function(md5) { // md5值计算完成
                    block.fileMd5 = md5;
                    $.ajax({
                        url: "/file-manage/filemanage/checkChunk?fileMd5=" + md5 + "&chunk=" + block.chunk,
                        type: "get",
                        success: function(data) {
                            if (data.success == 1) {
                                // 如果分块儿已上传则跳过
                                block.file.uuid = data.fileId;
                                deferred.reject();
                            } else {
                                // 否则webuploader接着往下走
                                deferred.resolve();
                            }
                        },
                        error: function(error) {
                            deferred.resolve();
                        }
                    });
                });
            return deferred.promise();
        }
    });


    uploader = WebUploader.create({
        // 不压缩image, 默认如果是jpeg，文件上传前会压缩一把再上传！
        resize: false,
        // swf文件路径
        swf: 'lib/Uploader.swf',
        // 文件接收服务器
        server: '/file-manage/filemanage/uploadFile',
        // 选择文件的按钮。可选。
        // 内部包含multiple，是否多选文件，默认可以多选
        pick: '#picker',
        // 开启分片上传。
        chunked: true,
        // [可选] [默认值：5242880] 如果要分片，分多大一片？ 默认大小为5M.
        chunkSize: chunkSize,
        // [默认值：3] 上传并发数。允许同时最大上传进程数。
        threads: 3,
        //  [默认值：2] 如果某个分片由于网络问题出错，允许自动重传多少次？
        chunkRetry: 2,
        // 指定Drag And Drop拖拽的容器，如果不指定，则不启动。
        dnd: document.body,
        // 是否禁掉整个页面的拖拽功能，如果不禁用，图片拖进来的时候会默认被浏览器打开，默认false。
        disableGlobalDnd: false,
        // 指定监听paste事件的容器，如果不指定，不启用此功能。此功能为通过粘贴来添加截屏的图片。建议设置为document.body。
        paste: document.body,

    });

    // 当有文件被添加进队列的时候
    uploader.on('fileQueued', function(file) {
        // 为文件添加全局唯一标识
        file.uuid = generateUUID();
        var $li = $('<div id="' + file.id + '" class="item">' +
                '<img>' +
                '<h4 class="info" style="display:inline-block;width:300px;">' + file.name + '</h4>' +
                '<p class="state" style="display:inline-block">等待上传...</p>' +
                '</div>'),
            $img = $li.find('img');
        // $list为容器jQuery实例
        $list.append($li);
        // 创建缩略图
        // 如果为非图片文件，可以不用调用此方法。
        // thumbnailWidth x thumbnailHeight 为 100 x 100
        uploader.makeThumb(file, function(error, src) {
            if (error) {
                // $img.replaceWith('<span>不能预览</span>');
                return;
            }

            $img.attr('src', src);
        }, thumbnailWidth, thumbnailHeight);
    });



    // 分块儿上传前传额外参数
    uploader.on('uploadBeforeSend', function(block, data) {
        // 分块儿开始位置
        data.start = block.start;
        // 分块儿结束位置
        data.end = block.end;
        // 文件类型
        data.fileType = block.file.ext;
        // 文件唯一标识
        data.uuid = block.file.uuid;
        // 分块儿文件MD5
        data.fileMd5 = block.fileMd5;
        // 删除其他数据
        // delete data.key;
    });

    // 文件上传过程中创建进度条实时显示。
    uploader.on('uploadProgress', function(file, percentage) {
        var $li = $('#' + file.id),
            $percent = $li.find('.progress .progress-bar');

        // 避免重复创建
        if (!$percent.length) {
            $percent = $('<div class="progress progress-striped active">' +
                '<div class="progress-bar" role="progressbar" style="width: 0%;height:10px;background-color:red">' +
                '</div>' +
                '</div>').appendTo($li).find('.progress-bar');
        }
        // $percent.show();
        $li.find('p.state').text('上传中' + Math.round(percentage * 100) + '%');

        $percent.css('width', percentage * 100 + '%');
    });

    uploader.on('uploadSuccess', function(file) {
        $('#' + file.id).find('p.state').text('已上传');
    });

    // 判断文件是否上传成功
    uploader.on('uploadAccept', function(file, response) {
        if (response.success == 1) {
            return true;
        } else {
            return false;
        }
    });

    // 上传出错
    uploader.on('uploadError', function(file) {
        $('#' + file.id).find('p.state').text('上传出错');
    });

    // 上传完成
    uploader.on('uploadComplete', function(file) {
        // 清除进度条
        $('#' + file.id).find('.progress').fadeOut();
        // 数据库存储文件信息
        var fileData = { "fileName": file.name, "fileSize": (file.size / 1024).toFixed(2) + "k", "objectId": file.uuid, "lastModifiedDate": file.lastModifiedDate, "md5": file.md5 };
        $.ajax({
            url: '/file-manage/filemanage/saveFileInfo',
            type: 'post',
            /*
             * 设置以json格式放到请求体中传送，更安全，传送的数据必须是字符串
             * 如果不设置contentType，data直接{"a":"a"}传送，则
             * 传送方式为Content-Type:application/x-www-form-urlencoded; charset=UTF-8，数据是在请求头中存放的
             */
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(fileData),
            success: function(data) {

                if (data.success == 1) {
                    if (!data.result) {
                        $('#' + file.id).find('p.state').text('文件保存出错，请稍后重试');
                    }
                }
            },
            error: function(data) {
                alert("文件保存出错，请稍后重试");
            }
        });
    });

    // 暂停开始上传改变按钮显示
    uploader.on('all', function(type) {
        if (type === 'startUpload') {
            state = 'uploading';
        } else if (type === 'stopUpload') {
            state = 'paused';
        } else if (type === 'uploadFinished') {
            state = 'done';
        }

        if (state === 'uploading') {
            $btn.text('暂停上传');
        } else {
            $btn.text('开始上传 ');
        }
    });

    // 开始上传和暂停上传按钮
    $btn.on('click', function() {
        if (state === 'uploading') {
            /**
             * uploader.stop();当前的上传继续，下个文件不开始上传
             */
            uploader.stop(true); // 当前上传直接中断
        } else {
            uploader.upload();
        }
    });
});

/*
 * js产生文件全局唯一标识，也是作为分块儿id使用的，也作为文件名和存储信息id使用
 */
function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
};

/**
 * 添加额外参数的方法
 * https://github.com/fex-team/webuploader/issues/145
 */