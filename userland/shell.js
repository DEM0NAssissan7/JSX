// Shell
create_file("/bin/sh", function () {
    // Text sequencing
    let tty_fd, framebuff_fd, fd_w;
    let watchdog_pid;
    let string_buffer = "";
    let clear_screen = function() {
        write(fd_w, "");
        string_buffer = "";
        prompt();
        add_cursor();
    }
    let remove_text = function(amount) {
        let string = read(fd_w);
        write(fd_w, string.substring(0, string.length - amount));
    }
    let add_text = function(text) {
        write(framebuff_fd, text);
    }
    let add_cursor = function() {
        add_text("█");
    }
    let hostname;
    let prompt = function() {
        add_text("[" + hostname + "]# ");
    }
    let paths = read(open("/etc/path", "r"));
    let internal_commands = [
        ["cd", function(args){
            if(!args[0]) add_text("cd: No path specified\n");
            else chdir(args[0])
        }],
        ["exit", exit]
    ];
    let executed = false;
    let run_command = function(command_string) {
        let args = [];
        let limiters = 0;
        let string = "";
        let command = "";
        for(let i = 0; i < command_string.length + 1; i++) {
            let char = command_string[i];
            if(char === '"' && limiters === 0){
                limiters++;
                continue;
            }
            if(char === '"' && limiters !== 0){
                limiters--;
                continue;
            }
            if(i === command_string.length || char === " " && limiters === 0) {
                if(command.length !== 0)
                    args.push(string);
                else
                    command = string;
                string = "";
                continue;
            }
            string += char;
        }
        if(command.length === 0)
            command = string;
        if(limiters !== 0) {
            add_text("sh: unterminated string. Will not execute.\n");
            prompt();
            add_cursor();
            return;
        }
        if(command.length === 0){
            prompt();
            add_cursor();
            return;
        }
        for(let i = 0; i < internal_commands.length; i++) {
            if(command === internal_commands[i][0]) {
                try {
                    internal_commands[i][1](args);
                } catch (e) {
                    add_text(e + "\n");
                }
                prompt();
                add_cursor();
                return;
            }
        }
        let success = false;
        let working_directory = getpwd();
        for(let i = 0; i < paths.length; i++) {
            try {
                open(paths[i] + command, "r");
                try {
                    let pid = exec(paths[i] + command, args);
                    watchdog_pid = exec("/bin/sh-watchdog", pid);
                    if(args[args.length - 1] !== "&")
                        wait();
                    executed = true;
                    success = true;
                    break;
                } catch (r) {
                    add_text(r + "\n");
                }
            } catch (e) {}
        }
        chdir(working_directory);
        if(!success){
            add_text("sh: command " + command + " not found\n");
            prompt();
            add_cursor();
            executed = false;
        }
    }
    this.main = function() {
        tty_fd = open("/dev/tty0", "r");
        framebuff_fd = open("/dev/stdin", "a");
        fd_w = open("/dev/stdin", "w");

        hostname = read(open("/etc/hostname", "r"));

        prompt();
        add_cursor();

        // Input handler
        let keyboard_fd = open("/dev/keyboard0", "r");
        let previous_key = "";
        poll(keyboard_fd, function() {
            if(executed === false)
                remove_text(1); // Remove cursor
            else
                executed = false;
            let key = read(keyboard_fd);
            if(!key) return;
            let cursor = true;
            (function() {
                switch(key) {
                    case "Enter":
                        add_text("\n");
                        cursor = false;
                        let commands = [];
                        let string = "";
                        for(let i = 0; i < string_buffer.length; i++) {
                            let char = string_buffer[i];
                            if(char === ";") {
                                commands.push(string);
                                string = "";
                                continue;
                            }
                            string += char;
                            if(i === string_buffer.length - 1)
                                commands.push(string);
                        }
                        for(let i = 0; i < commands.length; i++) {
                            run_command(commands[i]);
                        }
                        string_buffer = "";
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
                    case "F7":
                    case "F8":
                    case "F9":
                    case "F10":
                    case "F11":
                    case "F12":
                    case "End":
                    case "Home":
                    case "PageUp":
                    case "PageDown":
                    case "ScrollLock":
                    case "Pause":
                    case "Insert":
                    case "ContextMenu":
                                return;
                    case "Backspace":
                        if(string_buffer.length !== 0) {
                            string_buffer = string_buffer.substring(0, string_buffer.length - 1);
                            remove_text(1);
                        }
                        return;
                    case "Control":
                        previous_key = key;
                        return;
                    case "ArrowUp":
                    case "ArrowDown":
                        return;
                }
                // if(rm_text === true) remove_text(1);
                add_text(key);
                string_buffer += key;
            })();
            if(cursor) add_cursor();
            previous_key = key;
        });
        thread(function() {
            if(executed === true) {
                kill(watchdog_pid);
                prompt();
                add_cursor();
                executed = false;
            }
            sleep(10)
        })
        let time = get_time();
        for(let i = 0; i < 10000; i++) {
            let fd = open("/dev/keyboard0", "r");
            read(fd);
            close(fd);
        }
        thread_cancel();
    }
});
create_file("/bin/sh-watchdog", function() {
    this.main = function(pid) {
        let fd = open("/dev/keyboard0", "r");
        let stdin = open("/dev/stdin", "a");
        let previous_key = "";
        let kill_proc = function() {
            write(stdin, "sh: Killing process.\n");
            exit();
            kill(pid);
        }
        poll(fd, function() {
            let key = read(fd);
            if(previous_key === "Control") {
                switch(key) {
                    case "c":
                        kill_proc();
                        break;

                }
            }
            switch(key) {
                case "End":
                    kill_proc();
                    break;
            }
            previous_key = key;
        })
    }
});