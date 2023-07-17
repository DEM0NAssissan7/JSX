create_file = undefined;
let user_eval = function (code) {
    eval(code);
}
{
    // Uname
    let utsname = {
        system: "JSX",
        release: "0.01",
    }
    function uname() {
        return deep_obj(utsname);
    }

    // Users
    let c_user = 0;
    function setuid(uid) {
        if (c_process.user === 0)
            c_process.user = uid;
    }
    function getuid() {
        return c_user;
    }
    let is_root = function() {
        if(c_user === 0) return true;
        return false;
    }

    // Processes
    let processes = [];
    let c_process = {};
    let c_thread = {};
    let pids = 0;
    let Thread = function (exec, process) {
        this.exec = exec; // Create an object from the pass-in code
        this.last_execution = get_time();
        this.queued = false;
        this.sleep_time = 0;
        this.pid = pids++;
        this.process = process;
        this.suspended = false;
        this.dead = false;
    }
    let Process = function (code, args) {
        this.working_directory = "/";
        this.args = args;
        this.pid = pids;
        this.threads = [];
        this.user = 0;
        this.events = [];
        this.suspended = false;
        this.dead = false;

        this.code = new code();
        this.threads.push(new Thread(this.code.main, this)); // Push the main thread to the stack
    }

    // Events
    let events = [];
    let eventids = 0;
    let Event = function (handler) {
        this.process = c_process;
        this.thread = c_thread;
        this.user = c_user;
        this.handler = handler;
        this.eventid = eventids++;
    }
    let run_event = function (eventid, args) {
        let event = events[eventid];
        if (!event) throw new Error("Event " + eventid + " does not exist.");
        let old_process = c_process;
        let old_thread = c_thread;
        let old_user = c_user;
        try {
            c_process = event.process;
            c_thread = event.thread;
            c_user = event.user;
            event.handler(args);
        } catch (e) {
            console.error("Event " + eventid + " encountered an error (PID: " + c_process.pid + " [" + c_thread.pid + "]): " + e);
            console.error(e);
            rmevent(event.eventid);
        }
        c_process = old_process;
        c_thread = old_thread;
        c_user = old_user;
    }

    /* Filesystem:

        What is a filesystem? A filesystem is a prototype function that contains at least 3 things:
        1. A way to read and index files
        2. Permissions management
        3. The ability to be mounted

        For the official reference to a JSX filesystem, look at JSFS

        In order to create a filesystem, a few things must be done:
        2. A root directory must be created
        2. 


    */
    let mountpoints = [];
    let mountids = 0;
    let expand_filepath = function (path) {
        let prefix = c_process.working_directory;
        if (path[0] === "/" || !prefix)
            prefix = [];
    
        let prefix_path_strings = map_path_names(prefix);
        let input_path_strings = map_path_names(path);
    
        let string = "";
        for (let i = 0; i < prefix_path_strings.length; i++)
            string += "/" + prefix_path_strings[i];
        for (let i = 0; i < input_path_strings.length; i++)
            string += "/" + input_path_strings[i];
    
        return string;
    }
    let get_pathnames = function(path) {
        // Efficiently get path names
        let prefix = c_process.working_directory;
        if (path[0] === "/" || !prefix)
            prefix = [];
        
        let path_names = map_path_names(prefix);
        let input_path_strings = map_path_names(path);
        for(let i = 0; i < input_path_strings.length; i++)
            path_names.push(input_path_strings[i]);
        return path_names;
    }
    let get_file = function (path, suppress_error) {
        if (path === "") throw new Error("Cannot have an empty path.");
        let path_names = get_pathnames(path);
        // let path_names = map_path_names(expand_filepath(path));
        let index = 0;
        let filesystem = mountpoints[0];
        let file = filesystem.get_file(0);
        let referenced_file = file;
        let parent = file;
        for (let i = 0; i < path_names.length; i++) {
            let success = false;
            for (let j = 0; j < file.data.length; j++) {
                let child_file = filesystem.get_file(file.data[j]);
                if (!child_file) break;
                if (child_file.filename === path_names[i]) {
                    success = true;
                    index = file.data[j]
                    parent = file;
                    referenced_file = child_file;
                    file = child_file;

                    if (child_file.is_mountpoint === true) {
                        filesystem = mountpoints[file.mountid];
                        file = filesystem.get_file(0);
                    }
                    break;
                }
            }
            if (file.filetype !== "d") break;
            if (success === false) {
                if (!suppress_error) throw new Error("File '" + expand_filepath(path) + "' does not exist.");
                break;
            }
        }
        return {
            filesystem: filesystem,
            index: index,
            file: file,
            referenced_file: referenced_file,
            parent: parent
        };
    }
    let check_file_exists = function (path) {
        try {
            get_file(path);
        } catch (e) {
            return false;
        }
        return true;
    }
    let create_file = function (path, data, filetype) {
        if (check_file_exists(path)) throw new Error("'" + expand_filepath(path) + "' already exists.");
        get_file(path, true).filesystem.create_file(path, data, filetype, get_file(path, true));
    }
    // System calls
    function mkdir(path) {
        create_file(path, [], "d");
    }
    function rmdir(path) {
        let file = get_file(path);
        if (file.file.data.length === 0) {
            file.parent.data.splice(file.parent.data.indexOf(file.index), 1);
            file.filesystem.remove_file(file.index);
        } else throw new Error("Specified directory is not empty.");
    }
    function open(path, mode, data) {
        let file;
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
                for (let i = 0; i < file.events.length; i++)
                    run_event(file.events[i], data);
                return data;
            case "a":
                if (!check_file_exists(path))
                    create_file(path, "", "-"); // Create file if it does not exist
                file = get_file(path).file;
                if (file.filetype === "d") throw new Error("Specified file is a directory.");
                file.data += data;
                for (let i = 0; i < file.events.length; i++)
                    run_event(file.events[i], file.data);
                return file.data;
        }
    }
    function unlink(path) {
        let file = get_file(path);
        if (file.file.filetype !== "-") throw new Error("File is not normal.");
        file.parent.data.splice(file.parent.data.indexOf(file.index), 1);
        file.filesystem.remove_file(file.index);
    }
    function stat(path) {
        return get_file(path).file;
    }
    function chmod(path, permissions) {
        get_file(path).file.permissions = permissions;
    }
    function poll(path, handler) {
        let event = new Event(handler);
        get_file(path).file.events.push(event.eventid);
        events.push(event);
        return event.eventid;
    }
    function rmevent(eventid) {
        events[eventid] = undefined;
    }
    function chdir(path) {
        c_process.working_directory = path;
    }
    function readdir(path) {
        let file_descriptor = get_file(path);
        let file = file_descriptor.file;
        let filesystem = file_descriptor.filesystem;
        if (file.filetype !== "d") throw new Error("Specified file is not a directory.");
        let child_files = [];
        for (let i = 0; i < file.data.length; i++) {
            let child_file = filesystem.get_file(file.data[i]);
            child_files.push(child_file.filename);
        }
        return child_files;
    }
    let fs_mount = function (filesystem, path) {
        let file = get_file(path).file;
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
        let descriptor = get_file(path);
        let file = descriptor.file;
        let referenced_file = descriptor.referenced_file;
        let filesystem = descriptor.filesystem;
        if (referenced_file.is_mountpoint !== true && !file.data.mountid) throw new Error("A mountpoint or mounted device must be specified");
        // if (filesystem.path === "/") throw new Error("Cannot unmount root.");
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
    let log = function (message) {
        open("/var/log/kernel", "a", "[" + get_time() + "]: " + message + '\n');
    }

    /* Kernel filesystems

        These filesystems, based on JSFS, are made to serve a specific purpose.
        They run in the kernel space as they need privellaged access in order
        to accomplish a certain task.
        For example, procfs needs access to the processes[] array in order to
        be able to perform privelleged tasks on processes.
    */
    let procfs = function() {
        
    }


    // Initialize root virtual filesystem
    let tmprootfs = new JSFS();
    tmprootfs.mountid = mountids++;
    mountpoints.push(tmprootfs);

    // Create kernelfs files and mountpoints
    // Create devfs for managing devices, crucial for kernel function
    let devfs = new JSFS();
    mkdir("/dev");
    fs_mount(devfs, "/dev");
    open("/dev/devfs", "w", devfs);

    let kernelfs_mounts = [];
    let create_kernelfs_mount = function (path) {
        open("/dev/kernelfs" + kernelfs_mounts.length, "w", new JSFS()); // Create file reference for filesystem
        mkdir(path);
        mount("/dev/kernelfs" + kernelfs_mounts.length, path);
        kernelfs_mounts.push([path, "/dev/kernelfs" + kernelfs_mounts.length]);
    }
    let unmount_kernelfs_mounts = function () {
        for (let i = 0; i < kernelfs_mounts.length; i++) {
            umount(kernelfs_mounts[i][0]);
            rmdir(kernelfs_mounts[i][0]);
        }
        umount("/dev");
        rmdir("/dev");
    }
    let remount_kernelfs_mounts = function () {
        mkdir("/dev");
        fs_mount(devfs, "/dev");
        for (let i = 0; i < kernelfs_mounts.length; i++) {
            mkdir(kernelfs_mounts[i][0]);
            mount(kernelfs_mounts[i][1], kernelfs_mounts[i][0]);
        }
    }

    // Procfs
    {
        create_kernelfs_mount("/proc");
        open("/proc/uptime", "w", {});
    }

    create_kernelfs_mount("/sys");
    create_kernelfs_mount("/tmp");
    create_kernelfs_mount("/var");
    mkdir("/var/log");
    open("/var/log/kernel", "w", "");

    log("Kernelfs created");

    // Set root
    let set_root = function (device) {
        let filesystem = get_file(device).file.data;
        filesystem.mountid = 0;
        unmount_kernelfs_mounts();
        mountpoints[0] = filesystem;
        remount_kernelfs_mounts();
    }

    // Disk initialization driver
    {
        log("Loading disk init driver");
        // This driver imports the preset files set at the beginning of the program and does all the appropriate disk things.
        let disk = new JSFS();
        open("/dev/vda", "w", disk);

        // First, the driver creates a temporary mountpoint for the disk and mounts it
        mkdir("/mnt");
        mount("/dev/vda", "/mnt");

        // Second, the driver copies all the files specified in initial_filesystem
        log("Copying files from initial_filesystem");
        for (let i = 0; i < initial_filesystem.length; i++) {
            let file = initial_filesystem[i];
            if (file.length < 2)
                mkdir("/mnt" + expand_filepath(file[0]));
            else
                open("/mnt" + expand_filepath(file[0]), "w", file[1]);
        }
        log("Files copied.");

        // Third, unmount kernelfs and unmount the filesystem from its temporary location. Also, delete /mnt.
        umount("/mnt");
        rmdir("/mnt");
    }

    // Set root filesystem
    set_root("/dev/vda");

    // Root eval
    function root_eval(code) {
        if(is_root())
            eval(code);
    }

    // System suspension
    let suspended = false;

    // Scheduler
    let threads = [];
    let scheduler = function () {
        if (!suspended) {
            let start_time = get_time();
            // Push ready threads into the execution line
            for (let i = 0; i < processes.length; i++) {
                let process = processes[i];
                if (process.suspended === true) continue;
                for (let j = 0; j < process.threads.length; j++) {
                    let thread = process.threads[j];
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
                let time = get_time();
                if (time > start_time + 100) break; // Scheduler watchdog
                let thread = threads[0];

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
                    thread.exec(c_process.args);
                } catch (e) {
                    console.error("Process " + c_process.pid + " (" + thread.pid + ") encountered an error: " + e);
                    console.error(e);
                    thread.process.suspended = true;
                }
                threads.splice(0, 1); // Clear the thread from the execution stack
            }
            c_thread = {};
            c_process = {};
            c_user = 0;
        }
    }

    // Process systemcalls
    function exec(path, args) {
        // Creates a new process that runs the program at the specified path
        if (!check_file_exists(path)) throw new Error("Cannot execute '" + expand_filepath(path) + "': path does not exist");
        try {
            processes.push(new Process(get_file(path).file.data, args));
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
    let panicked = false;
    let panic = function (message) {
        panicked = true;
        console.error("FATAL: Kernel panic -> " + message);
        log("Kernel panicked: " + message);
        alert("System has encountered a fatal error -> '" + message + "'");
    }

    // Main loop
    let main = function () {
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