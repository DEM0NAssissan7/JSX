create_file("/etc/init.d/home.mount", function() {
    this.main = function() {
        // Mount the /dev/sda device at /home
        try {
            mount("/dev/sda", "/home");
        } catch (e) {
            console.error("Unable to mount cookie filesystem.")
            console.error(e);
            clear_cookies();
        }
        exit();
    }
});