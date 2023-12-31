/* The goal of drivers are to 
        1. Map devices to files
        2. Deal with edge cases
        3. Provide application interfaces with devices, virtual or real
    */

// Disk driver
create_file("/etc/init.d/disk", function() {
    this.main = function() {
        let fd = open("/dev/vda", "w");
        write(fd, jsx_system);
        close(fd);
        exit();
    }
});
// Mouse driver
create_file("/etc/init.d/mouse", function () {
    this.main = function () {
        let struct = {
            vectorX: 0,
            vectorY: 0,
            x: 0,
            y: 0,
            pressed: 0
        };
        let fd = open("/dev/mouse0", "w");
        write(fd, struct);
        close(fd);
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
        exit();
    }

});

// Keyboard driver
create_file("/etc/init.d/keyboard", function () {
    let key = "";
    this.main = function () {
        let fd = open("/dev/keyboard0", "w");
        write(fd, key);
        document.onkeydown = function(event) {
            write(fd, event.key);
            event.preventDefault();
        };
        thread_cancel();
    }
});

// Graphics driver
create_file("/etc/init.d/graphics", function() {
    let canvas = document.getElementById("canvas");
    this.main = function() {
        mkdir("/dev/js");
        let fd;
        fd = open("/dev/js/canvas0", "w");
        write(fd, canvas);
        close(fd);
        fd = open("/dev/js/graphics0", "w");
        write(fd, canvas.getContext("2d"));
        // Color black
        let graphics = read(fd);
        graphics.fillStyle = "black";
        graphics.fillRect(0, 0, graphics.canvas.width, graphics.canvas.height);
        exit();
    }
});

// Virtual console
create_file("/etc/init.d/ttyd", function() {
    this.main = function(){
        // Create a text framebuffer where each element influences a character on-screen
        let graphics_fd = open("/dev/js/graphics0", "r");
        let graphics = read(graphics_fd);
        // let text_size = 16;
        let height_ratio = 2;
        graphics.font = "12px Monospace"
        let canvas_width = graphics.canvas.width;
        let canvas_height = graphics.canvas.height;

        // Create constants for the text width and height
        let text_size = graphics.measureText("█");
        text_size.width = Math.round(text_size.width);
        text_size.height = Math.round(text_size.width * height_ratio);

        // Create text grid
        let width = Math.floor(canvas_width / text_size.width);
        let height = Math.floor(canvas_height / text_size.height);

        let fd = open("/dev/tty0", "w");
        write(fd,  {
            width: width,
            height: height,
            framebuffer: "/dev/stdin"
        });
        close(fd);
        fd = open("/dev/stdin", "w");
        write(fd, "");
        close(fd);
        let char;

        fd = open("/dev/stdin", "r");

        let text_size_width_rounded = Math.round(text_size.width);
        poll(fd, function() {
            graphics = read(graphics_fd)
            let string = read(fd);
            // Fill background
            graphics.fillStyle = "black"
            graphics.fillRect(0, 0, canvas_width, canvas_height);
            
            // Fill white text
            graphics.fillStyle = "white";
            // Parse the inputted text
            let y = text_size.height;
            let x = 0;
            let y_offset = 0;
            let parsed_string = "";
            for(let i = 0; i < string.length; i++) {
                char = string[i];
                if(char === '\b') {
                    parsed_string.substring(0, parsed_string.length - 1);
                    continue;
                }
                if(char === '\n') {
                    y += text_size.height;
                    x = 0;
                }
                if(y >= canvas_height) {
                    
                }
                if(x + text_size_width_rounded >= canvas_width) {
                    y += text_size.height;
                    x = 0;
                }
                parsed_string += char;
                x += text_size_width_rounded;
            }
            
            y = text_size.height - y_offset;
            x = 0;
            for(let i = 0; i < parsed_string.length; i++) {
                char = parsed_string[i];
                if(char === '\n') {
                    y += text_size.height;
                    x = 0;
                    continue;
                }
                if(x + text_size_width_rounded >= canvas_width) {
                    y += text_size.height;
                    x = 0;
                }
                if(x < canvas_width && y < canvas_height && x >= 0 && y >= 0) { // Don't draw anything outside display bounds
                    // Draw the character
                    graphics.fillText(parsed_string[i], x, y);
                }
                x += text_size_width_rounded;
            }
        });
        thread_cancel();
    }
});

// Standard input

// Cookie disk driver
create_file("/etc/init.d/cookiedisk", function() {
    let create_new_homefs = function() {
        let home_fs = new JSFS(3072); // Create a new FS with a size quota of 3KB (due to cookie limitations)
        document.cookie = "FS=" + home_fs.stringify() + ";";
        console.log(document.cookie)
        if(document.cookie.length === 0) throw new Error("Cookie did not write properly.");
    }
    this.main = function() {
        if(document.cookie.length === 0) create_new_homefs();
        var cookie = decodeURIComponent(document.cookie.trim());
        cookie = cookie.substring(3);

        let fd = open("/dev/js/cookie", "w");
        write(fd, document.cookie);
        close(fd);
        // See if there is an error in parsing the cookie filesystem
        // Create /home filesystem if it did not previously exist.
        
        try {
            fd = open("/dev/sda", "w");
            write(fd, fs_parse(cookie, JSFS));
            close(fd);
            exit();
        } catch (e) {
            if(e.name === "Error") {
                console.error("Cookiedisk: Cookie failed to be converted to a filesystem device. /home will not be mounted.");
                console.error(e);
                document.cookie = "";
                create_new_homefs();// Create a new filesystem
            }
        }
    }
});