// Init system
create_file("/run");
create_file("/run/log");
create_file("/run/log/journal", "");
create_file("/bin/init", function () {
    this.main = function () {
        chdir("/etc/init.d");
        let files = readdir(".");
        for (let i = 0; i < files.length; i++)
            exec(files[i]);
        exit();
    }
});