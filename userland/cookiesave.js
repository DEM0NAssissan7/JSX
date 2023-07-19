create_file("/etc/init.d/cookiesave", function() {
    let fd, sda_fd;
    this.main = function() {
        if(!fd) {
            fd = open("/var/log/cookiesave", "a");
            sda_fd = open("/dev/sda", "r");    
        }
        document.cookie = "FS=" + read(sda_fd).stringify() + ";";
        // open("/var/log/cookiesave", "a", "[" + get_time() + "] Filesystem saved\n");
        write(fd, get_time() + "\n");
        sleep(1000); // Save FS every 6 seconds.
    }
});