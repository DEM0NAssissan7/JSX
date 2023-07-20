create_file("/bin/js", function() {
    this.main = function(args) {

    }
});
create_file("/bin/ls", function() {
    this.main = function(args) {
        let fd = open("/dev/stdin", "a");
        if(!args)
            write(fd, readdir("."));
        else write(fd, readdir(args[0]));
        exit();
    }
});
create_file("/bin/echo", function() {
    this.main = function(path) {
        let fd = open("/dev/stdin", "a");
        if(!path)
            write(fd, readdir("."));
        else write(fd, readdir(path));
        exit();
    }
});