create_file("/bin/js", function() {
    this.main = function(args) {
        let string = "";
        let fd = open("/dev/stdin", "a");
        try {
            if(args[0] === "-e"){
                write(fd, eval(args[1]) + "\n");
            } else {
                write(fd, read(open(args[0], "r"))() + "\n");
                // eval(read(open(args[0], "r")));
            }
        } catch (e) {
            write(fd, e + "\n");
        }
        exit();
    }
});
create_file("/bin/ls", function() {
    let files;
    this.main = function(args) {
        let fd = open("/dev/stdin", "a");
        let list_directory = function(path) {
            files = readdir(path)
            for(let i = 0; i < files.length; i++)
                write(fd, files[i] + "  ");
        }
        try{
            if(args.length === 0)
                list_directory(".");
            else
                list_directory(args[0]);
        } catch (e) {
            write(fd, e);
        }
        write(fd, "\n");
        close(fd);
        exit();
    }
});
create_file("/bin/echo", function() {
    this.main = function(args) {
        let fd = open("/dev/stdin", "a");
        for(let i = 0; i < args.length; i++)
            write(fd, args[i] + " ");
        write(fd, "\n");
        exit();
    }
});
create_file("/bin/cat", function() {
    this.main = function(args) {
        let fd = open("/dev/stdin", "a");
        if(args.length === 0)
            write(fd, "A directory must be specified");
        else {
            try {
                write(fd, to_string(read(open(args[0], "r"))));
            } catch (e) {
                write(fd, e);
            }
        }
        write(fd, "\n");
        exit();
    }
});
create_file("/bin/pwd", function() {
    this.main = function() {
        let fd = open("/dev/stdin", "a");
        write(fd, getpwd() + "\n");
        exit();
    }
})
create_file("/bin/clear", function() {
    this.main = function() {
        let fd = open("/dev/stdin", "w");
        write(fd, "");
        close(fd);
        exit();
    }
})
create_file("/bin/mkdir", function() {
    this.main = function(args) {
        let fd = open("/dev/stdin", "a");
        if(!args[0]){
            write(fd, "A path must be specified.\n");
            exit();
        }
        try{
            mkdir(args[0]);
        } catch (e) {
            write(fd, e + "\n");
        }
        exit();
    }
});
create_file("/bin/touch", function() {
    this.main = function(args) {
        let fd = open("/dev/stdin", "a");
        if(!args[0]){
            write(fd, "No file operand.\n");
            exit();
        }
        try{
            open(args[0], "w");
        } catch (e) {
            write(fd, e + "\n");
        }
        exit();
    }
});
create_file("/bin/rm", function() {
    this.main = function(args) {
        let fd = open("/dev/stdin", "a");
        if(!args[0]){
            write(fd, "No file operand.\n");
            exit();
        }
        try{
            unlink(args[0]);
        } catch (e) {
            write(fd, e + "\n");
        }
        exit();
    }
});
create_file("/bin/rmdir", function() {
    this.main = function(args) {
        let fd = open("/dev/stdin", "a");
        if(!args[0]){
            write(fd, "No file operand.\n");
            exit();
        }
        try{
            rmdir(args[0]);
        } catch (e) {
            write(fd, e + "\n");
        }
        exit();
    }
});
create_file("/bin/kill", function() {
    this.main = function(args) {
        let fd = open("/dev/stdin", "a");
        if(!args[0]){
            write(fd, "No PID specified.\n");
            exit();
        }
        try{
            kill(args[0]);
        } catch (e) {
            write(fd, e + "\n");
        }
        exit();
    }
});