// Shell
create_file("/bin/sh", function () {
    // Text sequencing
    let tty_fd, framebuff_fd, fd_w;
    let clear_screen = function() {
        write(fd_w, "");
    }
    let remove_text = function(amount) {
        let string = read(fd_w);
        write(fd_w, string.substring(0, string.length - amount));
    }
    let add_text = function(text) {
        write(framebuff_fd, text);
    }
    let text_buffer = [];
    let paths = [
        ".",
        "/bin",
        "/usr/bin",
        "/home/.local/bin",
        "/home/bin"
    ];
    let internal_commands = [
        ["cd", function(args){
            if(!args[0]) add_text("cd: No path specified");
            else chdir(args[0])
        }],
        ["clear", clear_screen]
    ];
    let run_command = function() {
        let args = [];
        let limiters = 0;
        let string = "";
        for(let i = 1; i < text_buffer.length; i++) {
            for(let j = 0; j < text_buffer[i].length; j++){
                let char = text_buffer[i][j];
                if(char === '"' && limiters === 0){
                    limiters++;
                    continue;
                }
                if(char === '"' && limiters !== 0){
                    limiters--;
                    continue;
                }
                string += char;
            }
            if(limiters === 0 && string.length !== 0) {
                args.push(string);
                string = "";
            }
        }
        if(limiters !== 0) {
            add_text("sh: unterminated string. will not execute.");
        }
        let command = text_buffer[0];
        for(let i = 0; i < internal_commands.length; i++) {
            if(command === internal_commands[i][0]) {
                internal_commands[i][1](args);
                text_buffer = [];
                return;
            }
        }
        if(command.length === 0){
            text_buffer = [];
            return;
        }
        let success = false;
        let exec_fd;
        for(let i = 0; i < paths.length; i++) {
            try{
                chdir(paths[i]);
                try {
                    exec(command, args);
                    success = true;
                    break;
                } catch (r) {
                    // add_text(r + "\n");
                }
            } catch (e) {
            }
        }
        if(!success) add_text("sh: command " + command + " not found\n");
        text_buffer = [];
    }
    this.main = function() {
        tty_fd = open("/dev/tty0", "r");
        framebuff_fd = open("/dev/stdin", "a");
        fd_w = open("/dev/stdin", "w");

        add_text("Hello world\nThis is a test.\n");

        // Input handler
        let keyboard_fd = open("/dev/keyboard0", "r");
        let string_buffer = "";
        poll(keyboard_fd, function() {
            remove_text(1);
            let key = read(keyboard_fd);
            if(!key) return;
            (function() {
                switch(key) {
                    case "Enter":
                        text_buffer.push(string_buffer);
                        string_buffer = "";
                        add_text("\n");
                        run_command();
                        return;
                    case "Delete":
                        clear_screen();
                        return;
                    case "CapsLock":
                    case "Shift":
                    case "Alt":
                    case "Tab":
                    case "Escape":
                    case "NumLock":
                    case "ArrowLeft":
                    case "ArrowRight":
                    case "F1":
                    case "F2":
                    case "F3":
                    case "F4":
                    case "F5":
                    case "F6":
                        return;
                    case "Backspace":
                        remove_text(1);
                        string_buffer = string_buffer.substring(0, string_buffer.length - 1);
                        return;
                    case "Control":
                        return;
                    case "ArrowUp":
                    case "ArrowDown":
                        return;
                    case " ":
                        if(string_buffer.length !== 0) {
                            text_buffer.push(string_buffer);
                            string_buffer = "";
                        }
                        add_text(key);
                        return;
                }
                // if(rm_text === true) remove_text(1);
                add_text(key);
                string_buffer += key;
            })();
            add_text("█");
        });
        let time = get_time();
        for(let i = 0; i < 10000; i++) {
            let fd = open("/dev/keyboard0", "r");
            read(fd);
            close(fd);
        }
        exit();
    }
});