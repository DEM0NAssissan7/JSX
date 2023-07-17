// Shell
create_file("/bin/sh", function () {
    // Text sequencing
    let sequence_index = 0;
    let text_buffer = "";
    let newline = function() {
        let width = open("/dev/tty0", "r").width;
        let change = width - (sequence_index % width)
        if(change === 0)
            sequence_index += width;
        else
            sequence_index += change;
    }
    let clear_screen = function() {
        let tty = open("/dev/tty0", "r");
        sequence_index = 0;
        for(let i = 0; i < tty.width * tty.height; i++) {
            open("/dev/tty0fb", "w", [i, ""]);
        }
        text_buffer = "";
    }
    let remove_text = function(amount) {
        for(let i = 0; i < amount; i++) {
            open("/dev/tty0fb", "w", [sequence_index, ""]);
            sequence_index--;
        }
    }
    let add_text = function(text) {
        text_buffer += text;
        for(let i = 0; i < text.length; i++) {
            if(text[i] === '\n') {
                newline();
                continue;
            }
            open("/dev/tty0fb", "w", [sequence_index, text[i]]);
            sequence_index++;
        }
    }
    add_text("Hello world\nThis is a test.\n");
    this.main = function() {
        // Input handler
        poll("/dev/keyboard0", function(key) {
            let add_cursor = true;
            let rm_text = true;
            (function() {
                switch(key) {
                    case "Enter":
                        add_text("\n");
                        return;
                    case "Delete":
                        clear_screen();
                        return;
                    case "CapsLock":
                    case "Shift":
                    case "Alt":
                        return;
                    case "Backspace":
                        let width = open("/dev/tty0", "r").width;
                        if(sequence_index % width === 1) remove_text(width + 1);
                        else remove_text(2);
                        return;
                    case "Control":
                        return;
                    default:
                        
                }
                if(rm_text === true) remove_text(1);
                add_text(key);
            })();
            if(add_cursor === true) text_buffer[text_buffer.lenght - 1] = "█";
                add_text("█");
        });
        let time = get_time();
        for(let i = 0; i < 1000; i++) {
            open("/dev/keyboard0", "r");
        }
        console.log(get_time() - time);
        exit();
    }
});