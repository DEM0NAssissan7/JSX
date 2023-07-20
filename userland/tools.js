create_file("/bin/js", function() {
    this.main = function(args) {

    }
});
create_file("/bin/ls", function() {
    let files;
    this.main = function(args) {
        let fd = open("/dev/stdin", "a");
        let list_directory = function(path) {
            files = readdir(path)
            for(let i = 0; i < files.length; i++)
                write(fd, files[i] + " ");
        }
        if(args.length === 0)
            list_directory(".");
        else list_directory(args[0]);
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
        exit();
    }
});
create_file("/bin/cat", function() {
    this.main = function(args) {
        let fd = open("/dev/stdin", "a");
        if(args.length === 0) write(fd, "A directory must be specified");
        else write(fd, read(open(args[0], "r")));
        write(fd, "\n");
        exit();
    }
});