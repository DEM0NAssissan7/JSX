    /* The goal of drivers are to 
        1. Map devices to files
        2. Deal with edge cases
    */
    // Mouse driver
create_file("/etc/init.d/mouse", function () {
    var struct = {
        vectorX: 0,
        vectorY: 0,
        x: 0,
        y: 0,
        pressed: 0
    };
    fopen("/dev/mouse0", "w", struct);
    document.onmousemove = function (event) {
        struct.vectorX = struct.x - event.pageX + 8;
        struct.vectorY = struct.y - event.pageY + 8;
        struct.x = event.pageX - 8;
        struct.y = event.pageY - 8;
    };
    document.onmousedown = function() {
        struct.clicked = true;
    };
    document.onmouseup = function() {
        struct.clicked = false;
    };
    this.main = function () {
        exit();
    }

});

// Keyboard driver
create_file("/etc/init.d/keyboard", function () {
    fopen("/dev/keyboard0", "w", "");
    document.onkeydown = function(event) {
        fopen("/dev/keyboard0", "w", event.key);
    };
    this.main = function () {
        exit();
    }
});

// Graphics driver
create_file("/etc/init.d/graphics", function() {
    var canvas = document.getElementById("canvas");
    fopen("/dev/canvas0", "w", canvas);
    fopen("/dev/graphics0", "w", canvas.getContext("2d"));
    this.main = function() {
        // Color black
        var graphics = fopen("/dev/graphics0", "r");
        graphics.fillStyle = "black";
        graphics.fillRect(0, 0, graphics.canvas.width, graphics.canvas.height);
        exit();
    }
});

// Virtual console
create_file("/etc/init.d/ttyd", function() {
    // Create a text framebuffer where each element influences a character on-screen
    var graphics = fopen("/dev/graphics0", "r");
    var text_size = 16;
    var height_ratio = 1.42857;
    graphics.textSize = text_size;

    var width = Math.floor(graphics.canvas.width / (text_size * height_ratio));
    var height = Math.floor(graphics.canvas.height / text_size);
    var buffer = [];

    // Initialize buffer
    for(var i = 0; i < width * height; i++)
        buffer[i] = "";

    fopen("/dev/tty0", "w", {
        width: width,
        height: height,
        framebuffer: "/dev/tty0fb"
    });
    fopen("/dev/tty0fb", "w", [0, ""]);

    this.main = function(){
        // Create poll for framebuffer changes
        poll("/dev/tty0fb", function() {
            var fb_change = fopen("/dev/tty0fb", "r");
        });
        thread(function() {
            // Text graphics update thread
            var graphics = fopen("/dev/graphics0", "r");
            
            sleep(100);
        })
        exit();
    }
});