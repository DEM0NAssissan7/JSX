// Shell
create_file("/bin/sh", function () {
    // Text sequencing
    let sequence_index = 0;
    let text_buffer = "";
    let tty_fd, framebuff_fd;
    let newline = function() {
        let width = read(tty_fd).width;
        let change = width - (sequence_index % width)
        if(change === 0)
            sequence_index += width;
        else
            sequence_index += change;
    }
    let clear_screen = function() {
        let tty = read(tty_fd);
        sequence_index = 0;
        for(let i = 0; i < tty.width * tty.height; i++) {
            write(framebuff_fd, [i, ""])
        }
        text_buffer = "";
    }
    let remove_text = function(amount) {
        for(let i = 0; i < amount; i++) {
            write(framebuff_fd, [sequence_index, ""]);
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
            write(framebuff_fd, [sequence_index, text[i]]);
            sequence_index++;
        }
    }
    this.main = function() {
        tty_fd = open("/dev/tty0", "r");
        framebuff_fd = open("/dev/tty0fb", "w");
        add_text("Hello world\nThis is a test.\n");

        // Input handler
        let keyboard_fd = open("/dev/keyboard0", "r");
        poll(keyboard_fd, function(key) {
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
                        let width = read(tty_fd).width;
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
            if(add_cursor === true) text_buffer[text_buffer.length] = "█";
            add_text("█");
        });
        let time = get_time();
        for(let i = 0; i < 1000; i++) {
            let fd = open("/dev/keyboard0", "r");
            read(fd);
        }
        console.log(get_time() - time);
        exit();
    }
});