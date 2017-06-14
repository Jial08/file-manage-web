// 文件上传
jQuery(function () {
    var $ = jQuery,
        $list = $('#thelist'),
        $btn = $('#ctlBtn'),
        state = 'pending',
        // window.devicePixelRatio是设备上物理像素和设备独立像素(device-independent pixels (dips))的比例。
        ratio = window.devicePixelRatio || 1,
        // 设置图片缩略图大小
        thumbnailWidth = 100 * ratio,
        thumbnailHeight = 100 * ratio,
        uploader;

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
        // 指定Drag And Drop拖拽的容器，如果不指定，则不启动。
        dnd: document.body,
        // 是否禁掉整个页面的拖拽功能，如果不禁用，图片拖进来的时候会默认被浏览器打开，默认false。
        disableGlobalDnd: false,
        // 指定监听paste事件的容器，如果不指定，不启用此功能。此功能为通过粘贴来添加截屏的图片。建议设置为document.body。
        paste: document.body,

    });

    // 当有文件被添加进队列的时候
    uploader.on('fileQueued', function (file) {
        var fileType = file.type;
        alert(fileType);
        alert(fileType.indexOf("isdmage"))
        if (fileType.indexOf('image/') != -1) {
            alert(1)
        }
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
        uploader.makeThumb(file, function (error, src) {
            // if (error) {
            //     $img.replaceWith('<span>不能预览</span>');
            //     return;
            // }

            $img.attr('src', src);
        }, thumbnailWidth, thumbnailHeight);
    });

    // 文件上传过程中创建进度条实时显示。
    uploader.on('uploadProgress', function (file, percentage) {
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

    uploader.on('uploadSuccess', function (file) {
        $('#' + file.id).find('p.state').text('已上传');
    });

    // 判断文件是否上传成功
    uploader.on('uploadAccept', function (file, response) {
        if (response.success == 1) {
            // 通过return true或false来告诉组件，此文件上传成功或失败。
            return response.msg;
        } else {
            return false;
        }
    });

    uploader.on('uploadError', function (file) {
        $('#' + file.id).find('p.state').text('上传出错');
    });

    uploader.on('uploadComplete', function (file) {
        $('#' + file.id).find('.progress').fadeOut();
    });

    uploader.on('all', function (type) {
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

    $btn.on('click', function () {
        if (state === 'uploading') {
            uploader.stop(true);
        } else {
            uploader.upload();
        }
    });
});


/**
 * 添加额外参数的方法
 * https://github.com/fex-team/webuploader/issues/145
 */