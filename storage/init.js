// Init system
create_file("/run");
create_file("/run/log");
create_file("/run/log/journal", "");
create_file("/bin/init", function () {
    this.main = function () {
        let files = readdir("/etc/init.d");
        for (let i = 0; i < files.length; i++)
            exec("/etc/init.d/" + files[i]);
        exit();
    }
});
create_file("/etc/hostname", "jsx");