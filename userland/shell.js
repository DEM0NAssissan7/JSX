// Shell
create_file("/bin/sh", function () {
    // Text sequencing
    let sequence_index = 0;
    let add_text = function(text) {
        for(let i = 0; i < text.length; i++) {
            if(text[i] === '\n') {
                let width = open("/dev/tty0", "r").width;
                sequence_index += width - (sequence_index % width);
                continue;
            }
            open("/dev/tty0fb", "w", [sequence_index, text[i]]);
            sequence_index++;
        }
    }
    add_text("Hello world\nThis is a test.");
    this.main = function() {
        poll("/dev/keyboard0", function() {
            let key = open("/dev/keyboard0", "r");
            add_text(key);
        });
        exit();
    }
});