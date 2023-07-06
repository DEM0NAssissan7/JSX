    /* The goal of drivers are to 
        1. Map devices to files
        2. Deal with edge cases
    */
    // Mouse driver
create_file("/etc/init.d/mouse", function () {
    let struct = {
        vectorX: 0,
        vectorY: 0,
        x: 0,
        y: 0,
        pressed: 0
    };
    open("/dev/mouse0", "w", struct);
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
    let key = "";
    open("/dev/keyboard0", "w", key);
    document.onkeydown = function() {
        key = event.key;
    };
    this.main = function () {
        exit();
    }
});

// Graphics driver
create_file("/etc/init.d/graphics", function() {
    let canvas = document.getElementById("canvas");
    open("/dev/canvas0", "w", canvas);
    open("/dev/graphics0", "w", canvas.getContext("2d"));
    this.main = function() {
        // Color black
        let graphics = open("/dev/graphics0", "r");
        graphics.fillStyle = "black";
        graphics.fillRect(0, 0, graphics.canvas.width, graphics.canvas.height);
        exit();
    }
});

// Virtual console
create_file("/etc/init.d/ttyd", function() {
    // Create a text framebuffer where each element influences a character on-screen
    let graphics = open("/dev/graphics0", "r");
    let text_size = 16;
    let height_ratio = 1.42857;
    graphics.textSize = text_size;

    let width = Math.floor(graphics.canvas.width / (text_size * height_ratio));
    let height = Math.floor(graphics.canvas.height / text_size);
    let buffer = [];

    // Initialize buffer
    for(let i = 0; i < width * height; i++)
        buffer[i] = "";

    open("/dev/tty0", "w", {
        width: width,
        height: height,
        framebuffer: "/dev/tty0fb"
    });
    open("/dev/tty0fb", "w", [0, ""]);

    this.main = function(){
        poll("/dev/tty0fb", function() {
            let fb_change = open("/dev/tty0fb", "r");
            console.log(fb_change);
        });
        thread(function() {
            // Text graphics update thread
            let graphics = open("/dev/graphics0", "r");
            
            sleep(100);
        })
        exit();
    }
});