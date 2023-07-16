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
    document.onkeydown = function(event) {
        open("/dev/keyboard0", "w", event.key);
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
    // let text_size = 16;
    let height_ratio = 1.4;
    graphics.font = "12px Monospace"
    let canvas_width = graphics.canvas.width;
    let canvas_height = graphics.canvas.height;

    // Create constants for the text width and height
    let text_size = graphics.measureText("█");
    text_size.height = Math.round(text_size.width * height_ratio);

    // Create text grid
    let width = Math.floor(canvas_width / text_size.width);
    let height = Math.floor(canvas_height / text_size.height);
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
            buffer[fb_change[0]] = fb_change[1];
        });
        thread(function() {
            // Text graphics update thread
            let graphics = open("/dev/graphics0", "r");

            // Fill background
            graphics.fillStyle = "black"
            graphics.fillRect(0, 0, canvas_width, canvas_height);

            // Place all characters in the correct place on the symbol grid
            graphics.fillStyle = "white";
            for(let i = 0; i < buffer.length; i++) {
                let x = (i % width) * text_size.width;
                let y = (Math.floor(i / width) + 1) * text_size.height;

                graphics.fillText(buffer[i], Math.round(x), Math.round(y));
            }
            sleep(100);
        })
        exit();
    }
});