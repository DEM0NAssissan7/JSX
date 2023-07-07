/* Kernel: The heart of an OS

    The kernel serves numerous purposes, of which are the following:
    1. File management
    2. Process management
    3. Driver loading
    4. System initialization
    5. Device management
    6. Users and permissions

    Everything ties back to the kernel.
*/
create_file = undefined;
var user_eval = function (code) {
    eval(code);
}

{
    // Uname
    var utsname = {
        system: "JSX",
        release: "0.01",
    }
    function uname() {
        return deep_obj(utsname);
    }

    // Users
    var c_user = 0;
    function setuid(uid) {
        if (c_process.user === 0)
            c_process.user = uid;
    }

    // Processes
    var processes = [];
    var c_process = {};
    var c_thread = {};
    var pids = 0;
    var Thread = function (exec, process) {
        this.exec = exec;
        this.last_execution = get_time();
        this.queued = false;
        this.sleep_time = 0;
        this.pid = pids++;
        this.process = process;
        this.suspended = false;
        this.dead = false;
    }
    var Process = function (code) {
        this.working_directory = "/";
        this.pid = pids;
        this.threads = [];
        this.user = c_process.user;
        this.events = [];
        this.suspended = false;
        this.dead = false;

        var old_process = c_process;
        var old_thread = c_thread;
        c_process = this;
        this.code = new code(); // Create an object from the pass-in code
        this.threads.push(new Thread(this.code.main, this)); // Push the main thread to the stack
        c_process = old_process;
        c_thread = old_thread;
    }

    // Events
    var events = [];
    var eventids = 0;
    var Event = function (handler) {
        this.process = c_process;
        this.thread = c_thread;
        this.user = c_user;
        this.handler = handler;
        this.eventid = eventids++;
    }
    var run_event = function (eventid) {
        var event = events[eventid];
        if (event === null) return;
        if (!event) throw new Error("Event " + eventid + " does not exist.");
        var old_process = c_process;
        var old_thread = c_thread;
        var old_user = c_user;
        try {
            c_process = event.process;
            c_thread = event.thread;
            c_user = event.user;
            event.handler();
        } catch (e) {
            console.error("Event " + eventid + " encountered an error (PID: " + c_process.pid + " [" + c_thread.pid + "]): " + e);
            console.error(e);
            rmevent(event.eventid);
        }
        c_process = old_process;
        c_thread = old_thread;
        c_user = old_user;
    }

    // Filesystem
    var mountpoints = [];
    var mountids = 0;
    var VFile = function (path, data, filetype, inode) {
        this.inode = inode;
        this.path = path;
        var filename = "";
        for (var i = 0; i < path.length; i++) {
            var char = path[i];
            if (char === "/") {
                filename = "";
                continue;
            }
            filename += char;
        }
        this.filename = filename;
        this.data = data;
        this.filetype = filetype;
        this.owner = c_user;
        this.permissions = 664;
        this.is_mountpoint = false;
        this.mountid = null;
        this.events = [];
    }
    var Filesystem = function () {
        this.path = "/";
        var file = new VFile("/", [], "d", 0);
        file.is_mountpoint = true;
        this.files = [file];
        this.inodes = 1;
        this.mountid = null;
    }
    var create_fs = function () {
        return new Filesystem();
    }
    function mkfs(device) {
        var file = get_file(device);
        if (file.filetype !== "-") throw new Error("Filesystems can only be created using normal devices");
        get_file(device).file.data = new Filesystem();
    }
    var map_path_names = function (path) {
        var file_string = "";
        var string_list = [];
        for (var i = 0; i < path.length; i++) {
            var char = path[i];
            switch (char) {
                case "/":
                    if (file_string.length !== 0)
                        string_list.push(file_string);
                    file_string = "";
                    continue;
                    break;
                case ".":
                    if (i === path.length - 1) continue;
                    switch (path[i + 1]) {
                        case ".":
                            if (path[i + 2] === "/") {
                                string_list.splice(string_list.length - 1, 1);
                                i += 2;
                            }
                            break;
                        case "/":
                            i++;
                            continue;
                            break;
                    }
                    break;
            }
            file_string += char;
        }
        if (file_string.length !== 0)
            string_list.push(file_string);
        return string_list;
    }
    var expand_filepath = function (path) {
        var prefix = c_process.working_directory;
        if (path[0] === "/" || !prefix)
            prefix = [];

        var prefix_path_strings = map_path_names(prefix);
        var input_path_strings = map_path_names(path);

        var string = "";
        for (var i = 0; i < prefix_path_strings.length; i++)
            string += "/" + prefix_path_strings[i];
        for (var i = 0; i < input_path_strings.length; i++)
            string += "/" + input_path_strings[i];

        return string;
    }
    var get_file = function (path, suppress_error) {
        if (path === "") throw new Error("Cannot have an empty path.");
        var path_names = map_path_names(expand_filepath(path));
        var inode = 0;
        var filesystem = mountpoints[0];
        var file = filesystem.files[0];
        var referenced_file = file;
        var parent = file;
        for (var i = 0; i < path_names.length; i++) {
            var success = false;
            for (var j = 0; j < file.data.length; j++) {
                var child_file = filesystem.files[file.data[j]];
                if (!child_file) break;
                if (child_file.filename === path_names[i]) {
                    success = true;
                    inode = file.data[j]
                    parent = file;
                    referenced_file = child_file;
                    file = child_file;

                    if (child_file.is_mountpoint === true) {
                        filesystem = mountpoints[file.mountid];
                        file = filesystem.files[0];
                    }
                    break;
                }
            }
            if (file.filetype !== "d") break;
            if (success === false) {
                if (!suppress_error) throw new Error("File '" + path + "' does not exist.");
                break;
            }
        }
        return {
            filesystem: filesystem,
            inode: inode,
            file: file,
            referenced_file: referenced_file,
            parent: parent
        };
    }
    var check_file_exists = function (path) {
        try {
            get_file(path);
        } catch (e) {
            return false;
        }
        return true;
    }
    var create_file = function (path, data, filetype) {
        if (check_file_exists(path)) throw new Error("'" + path + "' already exists.");
        var parent_directory = get_file(path, true);
        var filesystem = parent_directory.filesystem;
        var inode = filesystem.inodes++;
        filesystem.files.push(new VFile(path, data, filetype, inode));
        parent_directory.file.data.push(inode);
    }
    // System calls
    function mkdir(path) {
        create_file(path, [], "d");
    }
    function rmdir(path) {
        var file = get_file(path);
        if (file.file.data.length === 0) {
            file.parent.data.splice(file.parent.data.indexOf(file.inode), 1);
            file.filesystem.files[file.inode] = undefined;
        } else throw new Error("Specified directory is not empty.");
    }
    function fopen(path, mode, data) {
        var file;
        switch (mode) {
            case "r":
                file = get_file(path).file;
                if (file.filetype === "d") throw new Error("Specified file is a directory.");
                return file.data;
            case "w":
                if (!check_file_exists(path))
                    create_file(path, "", "-"); // Create file if it does not exist
                file = get_file(path).file;
                if (file.filetype === "d") throw new Error("Specified file is a directory.");
                file.data = data;
                for (var i = 0; i < file.events.length; i++)
                    run_event(file.events[i]);
                return data;
            case "a":
                if (!check_file_exists(path))
                    create_file(path, "", "-"); // Create file if it does not exist
                file = get_file(path).file;
                if (file.filetype === "d") throw new Error("Specified file is a directory.");
                file.data += data;
                for (var i = 0; i < file.events.length; i++)
                    run_event(file.events[i]);
                return file.data;
        }
    }
    function unlink(path) {
        var file = get_file(path);
        if (file.file.filetype !== "-") throw new Error("File is not normal.");
        file.parent.data.splice(file.parent.data.indexOf(file.inode), 1);
        file.filesystem[file.inode] = undefined;
    }
    function stat(path) {
        return get_file(path).file;
    }
    function chmod(path, permissions) {
        get_file(path).file.permissions = permissions;
    }
    function poll(path, handler) {
        var event = new Event(handler);
        get_file(path).file.events.push(event.eventid);
        events.push(event);
        return event.eventid;
    }
    function rmevent(eventid) {
        events[eventid] = null;
    }
    function chdir(path) {
        c_process.working_directory = path;
    }
    function readdir(path) {
        var file_descriptor = get_file(path);
        var file = file_descriptor.file;
        var filesystem = file_descriptor.filesystem;
        if (file.filetype !== "d") throw new Error("Specified file is not a directory.");
        var child_files = [];
        for (var i = 0; i < file.data.length; i++) {
            var child_file = filesystem.files[file.data[i]];
            child_files.push(child_file.filename);
        }
        return child_files;
    }
    var fs_mount = function (filesystem, path) {
        var file = get_file(path).file;
        if (file.filetype !== "d") throw new Error("Mountpoint must be a directory");
        if (filesystem.mountid !== null) throw new Error("Filesystem is already mounted");
        file.is_mountpoint = true;
        file.mountid = mountids;
        filesystem.path = expand_filepath(path);
        filesystem.mountid = mountids++;
        mountpoints.push(filesystem);
    }
    function mount(device, path) {
        // if(file.file.filetype !== "b") throw new Error("Specified file is not a block device.");
        fs_mount(get_file(device).file.data, path);
    }
    function umount(path) {
        var descriptor = get_file(path);
        var file = descriptor.file;
        var referenced_file = descriptor.referenced_file;
        var filesystem = descriptor.filesystem;
        if (referenced_file.is_mountpoint !== true && !file.data.mountid) throw new Error("A mountpoint or mounted device must be specified");
        if (filesystem.path === "/") throw new Error("Cannot unmount root.");
        if (file.data.mountid) { // If the specified path is a mounted device
            filesystem = file.data;
            file = get_file(filesystem.path).file;
        }
        referenced_file.is_mountpoint = false;
        referenced_file.mountid = null;
        filesystem.path = "/";
        mountpoints[filesystem.mountid] = undefined;
        filesystem.mountid = null;
    }

    // Logging
    var log = function (message) {
        fopen("/var/log/kernel", "a", "[" + get_time() + "]: " + message + '\n');
    }

    // Initialize root virtual filesystem
    var tmprootfs = create_fs();
    tmprootfs.mountid = mountids++;
    mountpoints.push(tmprootfs);

    // Create kernelfs files and mountpoints
    // Create devfs for managing devices, crucial for kernel function
    var devfs = create_fs();
    mkdir("/dev");
    fs_mount(devfs, "/dev");
    fopen("/dev/devfs", "w", devfs);

    var kernelfs_mounts = [];
    var create_kernelfs_mount = function (path) {
        fopen("/dev/kernelfs" + kernelfs_mounts.length, "w", create_fs()); // Create file reference for filesystem
        mkdir(path);
        mount("/dev/kernelfs" + kernelfs_mounts.length, path);
        kernelfs_mounts.push([path, "/dev/kernelfs" + kernelfs_mounts.length]);
    }
    var unmount_kernelfs_mounts = function () {
        for (var i = 0; i < kernelfs_mounts.length; i++) {
            umount(kernelfs_mounts[i][0]);
            rmdir(kernelfs_mounts[i][0]);
        }
        umount("/dev");
        rmdir("/dev");
    }
    var remount_kernelfs_mounts = function () {
        mkdir("/dev");
        fs_mount(devfs, "/dev");
        for (var i = 0; i < kernelfs_mounts.length; i++) {
            mkdir(kernelfs_mounts[i][0]);
            mount(kernelfs_mounts[i][1], kernelfs_mounts[i][0]);
        }
    }

    create_kernelfs_mount("/sys");
    create_kernelfs_mount("/proc");
    create_kernelfs_mount("/tmp");
    create_kernelfs_mount("/var");
    mkdir("/var/log");
    fopen("/var/log/kernel", "w", "");

    log("Kernelfs created");

    // Set root
    var set_root = function (device) {
        var filesystem = get_file(device).file.data;
        filesystem.mountid = 0;
        unmount_kernelfs_mounts();
        mountpoints[0] = filesystem;
        remount_kernelfs_mounts();
    }

    // Basic disk driver
    {
        log("Loading disk driver");
        // This driver imports the preset files set at the beginning of the program and does all the appropriate disk things.
        var disk = create_fs();
        fopen("/dev/vda", "w", disk);

        // First, the driver creates a temporary mountpoint for the disk and mounts it
        mkdir("/mnt");
        mount("/dev/vda", "/mnt");

        // Second, the driver copies all the files specified in initial_filesystem
        log("Copying files from initial_filesystem");
        for (var i = 0; i < initial_filesystem.length; i++) {
            var file = initial_filesystem[i];
            if (file.length < 2)
                mkdir("/mnt" + expand_filepath(file[0]));
            else
                fopen("/mnt" + expand_filepath(file[0]), "w", file[1]);
        }
        log("Files copied from initial_filesystem");

        // Third, unmount kernelfs and unmount the filesystem from its temporary location. Also, delete /mnt.
        umount("/mnt");
        rmdir("/mnt");
    }

    // Set root filesystem
    set_root("/dev/vda");

    // Root eval
    function root_eval(code) {
        eval(code);
    }

    // System suspension
    var suspended = false;

    // Scheduler
    var threads = [];
    var scheduler = function () {
        if (!suspended) {
            var start_time = get_time();
            // Push ready threads into the execution line
            for (var i = 0; i < processes.length; i++) {
                var process = processes[i];
                if (process.suspended === true) continue;
                for (var j = 0; j < process.threads.length; j++) {
                    var thread = process.threads[j];
                    if (thread.dead === true) {
                        process.threads.splice(j, 1);
                        continue;
                    }
                    if (thread.last_execution + thread.sleep_time <= start_time && thread.queued === false && thread.suspended === false) {
                        thread.queued = true;
                        threads.push(thread);
                    }
                }
            }

            while (threads.length > 0) {
                var time = get_time();
                if (time > start_time + 100) break; // Scheduler watchdog
                var thread = threads[0];

                c_thread = thread;
                c_process = thread.process;
                c_user = thread.process.user;
                thread.queued = false;
                if (thread.suspended === true || c_process.suspended === true) {
                    threads.splice(0, 1);
                    continue;
                }
                thread.last_execution = time;
                try {
                    thread.exec();
                } catch (e) {
                    console.error("Process " + c_process.pid + " (" + thread.pid + ") encountered an error: " + e);
                    console.error(e);
                    thread.process.suspended = true;
                }
                threads.splice(0, 1); // Clear the thread from the execution stack
            }
            c_thread = {};
            c_process = {user: 0};
            c_user = 0;
        }
    }

    // Process systemcalls
    function exec(path) {
        // Creates a new process that runs the program at the specified path
        if (!check_file_exists(path)) throw new Error("Cannot execute '" + path + "': path does not exist");
        try {
            processes.push(new Process(get_file(path).file.data));
        } catch (e) {
            console.error("Failed to execute '" + expand_filepath(path) + "': " + e);
            console.error(e);
        }
    }
    function thread(code) {
        c_process.threads.push(new Thread(code, c_process));
    }
    function sleep(timeout) {
        c_thread.sleep_time = timeout;
    }
    function exit() {
        c_thread.dead = true;
    }

    // Panic
    var panicked = false;
    var panic = function (message) {
        panicked = true;
        console.error("FATAL: Kernel panic -> " + message);
        log("Kernel panicked: " + message);
        alert("System has encountered a fatal error -> '" + message + "'");
    }

    // Main loop
    var main = function () {
        scheduler();
        if (panicked === false)
            setTimeout(main, 0);
    }
    
    try {
        log("Starting main loop");
        main();
    } catch (e) {
        panic("Failed to initialize.");
    }

    // Execute init
    log("Running init");
    exec("/bin/init");
}