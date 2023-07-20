// Vi: The basic text editor.
create_file("/bin/vi", function() {


    this.main = function(args) {
        let stdin = open("/dev/stdin", "w");
        let file = open(args[0], "w");

        let original_file = file;
    }
})