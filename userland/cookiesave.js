create_file("/var/log/cookiesave", "");
create_file("/bin/cookiesave", function() {
    this.main = function() {
        sleep(60000); // Save FS every 60 seconds.
    }
});