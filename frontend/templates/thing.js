'use strict';

/* global Vue */
/* global shortcut */
/* global asyncForEach */

Vue.component('thing', {
    template: '#thing-template',
    data: function () {
        return {
            shareLink: '',
            busy: false,
            uploadProgress: -1
        };
    },
    props: {
        thing: {
            type: Object,
            required: true
        },
        profile: {
            type: Object,
            required: true
        }
    },
    methods: {
        showEdit: function () {
            var id = this.thing.id;

            this.thing.edit = true;

            Vue.nextTick(function() {
                var margin = 20;

                $('#textarea-' + id).focus();
                $('#textarea-' + id).height($(window).height() - $('#mainNavigationBar').height() - (margin*2) - 60 - 20);

                window.scroll(0, $('#card-' + id).offset().top - $('#mainNavigationBar').height() - margin);
            });
        },
        saveEdit: function () {
            var that = this;

            this.busy = true;

            this.$root.Core.things.edit(this.thing, function (error, result) {
                that.busy = false;

                if (error) return console.error(error);

                // update the enhanced content from the server
                that.thing.richContent = result.richContent;
                that.thing.edit = false;

                // edited item is now on top
                if (!that.$root.settings.keepPositionAfterEdit) {
                    Vue.nextTick(function () { window.scrollTo(0,0); });
                }

                that.$root.refreshTags();
                window.Guacamoly.disableCheckboxes();
            });
        },
        cancelEdit: function () {
            this.thing.edit = false;
        },
        showArchive: function () {
            $('#modalArchive-' + this.thing.id).modal('show');
        },
        showDelete: function () {
            $('#modalDel-' + this.thing.id).modal('show');
        },
        deleteThing: function () {
            var that = this;

            this.$root.Core.things.del(this.thing, function (error) {
                if (error) return console.error(error);

                $('#modalArchive-' + that.thing.id).modal('hide');
                $('#modalDel-' + that.thing.id).modal('hide');
            });
        },
        showShareLink: function () {
            var that = this;

            this.thing.shared = true;

            this.$root.Core.things.edit(this.thing, function (error) {
                if (error) return console.error(error);

                that.shareLink = location.origin + '/shared.html?userId=' + that.$root.profile.username + '&id=' + that.thing.id;

                $('#modalShare-' + that.thing.id).modal('show');
            });
        },
        togglePublic: function () {
            var that = this;

            this.thing.public = !this.thing.public;

            this.$root.Core.things.edit(this.thing, function (error) {
                if (error) return console.error(error);

                that.shareLink = '';
            });
        },
        toggleSticky: function () {
            this.thing.sticky = !this.thing.sticky;

            this.$root.Core.things.edit(this.thing, function (error) {
                if (error) return console.error(error);
            });
        },
        toggleArchive: function () {
            var that = this;

            this.busy = true;

            this.thing.archived = !this.thing.archived;
            this.thing.public = this.thing.archived ? false : this.thing.public;

            this.$root.Core.things.edit(this.thing, function (error) {
                that.busy = false;
                if (error) return console.error(error);
                $('#modalArchive-' + that.thing.id).modal('hide');
            });
        },
        uploadFileChanged: function (event) {
            var that = this;

            var count = event.target.files.length;
            var stepSize = 100 / count;
            var currentIndex = 0;

            this.uploadProgress = 1;

            asyncForEach(event.target.files, function (file, callback) {
                var formData = new FormData();
                formData.append('file', file);

                that.$root.Core.things.uploadFile(formData, function (progress) {
                    var tmp = Math.ceil(stepSize * currentIndex + (stepSize * progress));
                    that.uploadProgress = tmp > 100 ? 100 : tmp;
                }, function (error, result) {
                    if (error) return callback(error);

                    currentIndex++;

                    that.thing.content += ' [' + result.fileName + '] ';
                    that.thing.attachments.push(result);

                    callback();
                });
            }, function (error) {
                if (error) console.error('Error uploading file.', error);

                that.uploadProgress = -1;
            });
        },
        triggerUploadFileInput: function () {
            $('#fileUpload-' + this.thing.id).click();
        },
        activateProposedTag: function (tag) {
            var that = this;

            var word = Vue.getCurrentSearchWord(this.thing.content, $('#textarea-' + this.thing.id));
            if (!word) return console.log('nothing to add');

            var cursorPosition = $('#textarea-' + this.thing.id)[0].selectionStart;

            this.thing.content = this.thing.content.replace(new RegExp(word, 'g'), function (match, offset) {
                return ((cursorPosition - word.length) === offset) ? ('#' + tag.name) : match;
            });

            Vue.nextTick(function () { $('#textarea-' + that.thing.id).focus(); });
        },
        // prevent from bubbling up to the main drop handler to allow textarea drops
        preventEventBubble: function (event) {
            event.cancelBubble = true;
        },
        dropOrPasteHandler: function (event) {
            event.cancelBubble = false;
            var that = this;

            var data;
            if (event.type === 'paste') data = event.clipboardData.items;
            else if (event.type === 'drop') data = event.dataTransfer.items;
            else return;

            for (var i = 0; i < data.length; ++i) {
                if (data[i].kind === 'file') {
                    var formData = new FormData();
                    var file = data[i].getAsFile();

                    // find unused filename
                    var j = 0;
                    var name = file.name;
                    while (that.thing.content.indexOf(name) !== -1) {
                        name = j + '_' + file.name;
                        ++j;
                    }
                    formData.append('file', file, name);

                    this.$root.Core.things.uploadFile(formData, function () {}, function (error, result) {
                        if (error) console.error(error);

                        that.thing.content += ' [' + result.fileName + '] ';
                        that.thing.attachments.push(result);
                    });

                    event.cancelBubble = true;
                    event.preventDefault();
                }
            }
        }
    },
    ready: function () {
        shortcut.add('Ctrl+s', this.saveEdit.bind(this), { target: 'textarea-' + this.thing.id });
        shortcut.add('Ctrl+Enter', this.saveEdit.bind(this), { target: 'textarea-' + this.thing.id });

        window.Guacamoly.disableCheckboxes();
    }
});
