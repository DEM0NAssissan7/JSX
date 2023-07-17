create_file("/etc/init.d/cookiesave", function() {
    this.main = function() {
        document.cookie = "FS=" + open("/dev/sda", "r").stringify() + ";";
        // open("/var/log/cookiesave", "a", "[" + get_time() + "] Filesystem saved\n");
        open("/var/log/cookiesave", "a", get_time() + "\n");
        sleep(1000); // Save FS every 6 seconds.
    }
});