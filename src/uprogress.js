;(function ( $ ) {

    /**
     * Returns a new - Progress instance
     * @param {jQuery} el - The jQuery selected elements
     * @param {Object} options - The plugin options
     * @returns {Progress}
     */
    function Progress (el, options)
    {
        var defaults = {
            url:    '?filename={filename}&progress={progress}',
            progressEl: '#progress-result',
            onBlocksize:  this.onBlocksize,
            onProgress: this.onProgress,
            onError:    this.onError
        }
        
        var plugin = this;

        plugin.settings = {}

        var init = function() {
            plugin.settings = $.extend({}, defaults, options);
            plugin.el       = el;
            plugin.files    = [];
            plugin.data     = [];
            plugin.ajax     = [];
        }
        
        // call the "constructor" method
        init();
        plugin.listen();
    }
    
    /**
     * Starts to listen to target element
     * @returns {Boolean}
     */
    Progress.prototype.listen = function ()
    {
        var me = this;
        if (this.el.length === 0) return false;
        this.el.on(
            'change', 
            function (evt) {
                me.handleFileSelect(evt, me) 
            }
        );
        return true;
    }
    
    /**
     * Event callback for resolving block size
     * The amount of data to be sent to server on each Ajax request
     * @param {integer} total - The total size of the file
     * @returns {integer}
     */
    Progress.prototype.onBlocksize = function(total) {
        return parseInt(total/10);
    }
    
    /**
     * Event callback for each time it receives an ajax response
     * @param {integer} i - The file index to be uploaded
     * @param {integer} progress - The amount of upload progress in %
     * @param {string} filename - The name of the file
     * @returns {undefined}
     */
    Progress.prototype.onProgress = function (i, progress, filename) {
        if (!$(this.progressEl+' li[class="p'+i+'"]').length) {
            $(this.progressEl).append('<li class="p'+i+'">');
        }
        $(this.progressEl+' li[class="p'+i+'"]').css('width', ''+progress+'%').text(filename+' '+progress+'%');
        if (progress === 100) {
            $(this.progressEl+' li[class="p'+i+'"]').fadeTo('slow', 0.5);
        }
    }
    
    /**
     * Event callback when an error occurs
     * @param {integer} i - The file index to be uploaded
     * @param {integer} progress - The amount of upload progress in %
     * @param {string} filename - The name of the file
     * @returns {undefined}
     */
    Progress.prototype.onError = function(i, progress, filename) {
        if (!$(this.progressEl+' li[class="p'+i+'"]').length) {
            $(this.progressEl).append('<li class="p'+i+'">');
        }
        $(this.progressEl+' li[class="p'+i+'"]').css('width', '100%').text(filename+' error: could not save file!');
    }

    /**
     * Utility method to slice the file
     * @param {ArrayBuffer} ab - The complete file as  ArrayBuffer
     * @param {integer} start - The start of the slice
     * @param {integer} end - The end of the slice
     * @returns {ArrayBuffer}
     */
    Progress.prototype.bufferSlice = function (ab, start, end)
    {
        var that = new Uint8Array(ab);
        if (end === undefined) {
            end = that.length;
        }
        var result = new ArrayBuffer(end - start);
        var resultArray = new Uint8Array(result);
        for (var i = 0; i < resultArray.length; i++)
           resultArray[i] = that[i + start];
        return result;
    }

    /**
     * The upload method. It creates an Ajax request to send the file slice
     * @param {integer} start - The start of the block
     * @param {integer} size - The block size
     * @param {integer} i - The file index
     * @returns {undefined}
     */
    Progress.prototype.upload = function (start, size, i)
    {
        var data = this.data[i];
        var total = data.byteLength;
        var filename = this.files[i].name;
        var progress = parseInt((start + size)/total*100);
        var part;
        var url = this.settings.url;
        url = url.replace("\{filename\}", filename, "gi");
        url = url.replace("\{progress\}", progress, "gi");
        if (window.chrome) {
            part = new DataView(this.bufferSlice(data, start, start + size));
        } else {
            part = this.bufferSlice(data, start, start + size);
        }
        this.ajax[i] = new XMLHttpRequest();
        this.ajax[i].open("POST", url, 1);
        this.ajax[i].setRequestHeader("Content-type", 'text/plain; charset=x-user-defined');
        var me = this;
        this.ajax[i].onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                var response = JSON.parse(this.responseText);
                next = start + size;
                if (!response.result) {
                    return me.settings.onError(i, progress, filename);
                }
                me.settings.onProgress(i, progress, filename);
                if (next > total) return;
                start = next;
                if (start + size > total) {
                    size = total - start;
                }
                if (size > 0) me.upload(start, size, i);
            }
        }
        this.ajax[i].send(part);
    }

    /**
     * Event callback to handle the user input
     * @param {Object} evt - The event
     * @param {Progress} me - The plugin instance
     * @returns {undefined}
     */
    Progress.prototype.handleFileSelect = function (evt, me)
    {
        console.log(evt);
        var files = evt.target.files;
        for (var i = 0, f; f = files[i]; i++) {
            me.files.push(f);
            var k = me.files.length-1;
            var reader = new FileReader();
            reader.onloadend = (function(j) {
                return function(e) {
                    me.data[j] = e.target.result;
                    var total = me.data[j].byteLength;
                    var size = me.settings.onBlocksize(total);
                    if (total < size) size = total;
                    me.upload(0, size, j);
                };
            })(k);
            reader.readAsArrayBuffer(f);
        }
    }
    
    /**
     * Adds Progress to jQuery plugins
     * @param {Object} options - The plugin options
     * @returns {Progress}
     */
    $.fn.Progress = function(options) {
        return new Progress(this, options);
    }

}( jQuery ));
