// Init system
create_file("/run");
create_file("/run/log");
create_file("/run/log/journal", "");
create_file("/bin/init", function () {
    this.main = function () {
        chdir("/etc/init.d");
        var files = readdir(".");
        for (var i = 0; i < files.length; i++)
            exec(files[i]);
        exit();
    }
});