// Initialize the JSX userland
create_file("/etc/init.d/userland", function() {
    this.main = function() {
        exec("/bin/sh");
        exit();
    }
});
create_file("/etc/path", [
    "",
    "/bin/",
    "/usr/bin/",
    "/home/.local/bin/",
    "/home/bin/"
]);