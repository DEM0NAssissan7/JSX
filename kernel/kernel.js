create_file = undefined;
let user_eval = function (code) {
    eval(code);
}
{
    // Uname
    let utsname = {
        system: "JSX",
        release: "0.02",
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
        if(c_user === 0)
            return true;
        return false;
    }
    let is_permitted = function(user) {
        if(c_user === user || c_user === 0)
            return true;
        return false;
    }

    // Processes
    let processes = [];
    let c_process = { file_descriptors: [] };
    let c_thread = {};
    let pids = 0;
    let Thread = function (exec, process) {
        this.exec = exec; // Create an object from the pass-in code
        this.last_execution = get_time();
        this.queued = false;
        this.sleep_time = -1;
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
        this.file_descriptors = [];
        this.events = [];
        this.suspended = false;
        this.dead = false;

        this.code = new code();
        this.threads.push(new Thread(this.code.main, this)); // Push the main thread to the stack
    }
    Process.prototype.die = function() {
        this.threads = [];
        for(let i = 0; i < this.events.length; i++) // Remove all events
            rmevent(this.events[i]);
        this.dead = true;
    }
    let get_process = function(pid) {
        return processes.find(function(p){return p.pid === pid});
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
        if (!event) return
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
    // File descriptors: a number reference to an opened file.
    let file_descriptors = [];
    let fd_indexes = 0;
    let file_descriptor = function(file, file_index, mode, permissions, filesystem, user) {
        this.file = file;
        this.file_index = file_index;
        this.permissions = permissions;
        this.mode = mode;
        this.filesystem = filesystem;
        this.user = user;
    }
    let get_file_descriptor = function(fd) {
        let descriptor = file_descriptors[fd];
        if(!descriptor) throw new Error("File descriptor does not exist.");
        if(!is_permitted(descriptor.user)) throw new Error("Not permitted to get file descriptor");
        return descriptor;
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
    function open(path, mode) {
        let file_info;
        try {
            file_info = get_file(path);
        } catch (e) {
            if (mode === "w" || mode === "a")
                create_file(path, "", "-"); // Create file if it does not exist
            else throw new Error("Cannot create '" + expand_filepath(path) + "': not opened in writing mode");
            file_info = get_file(path);
        }

        let file = file_info.file;
        if (file.filetype === "d") throw new Error("Specified file is a directory.");
        let fd = new file_descriptor(file_info.file, file_info.index, mode, file_info.file.permissions, file_info.filesystem, c_user);
        file_descriptors[fd_indexes] = fd;
        c_process.file_descriptors[fd_indexes] = fd;
        return fd_indexes++;
    }
    function read(fd) {
        return get_file_descriptor(fd).file.data;
    }
    function write(fd, data) {
        let descriptor = get_file_descriptor(fd);
        let file = descriptor.file;
        descriptor.filesystem.edit_file(descriptor.file_index, data, descriptor.mode);
        for (let i = 0; i < file.events.length; i++)
            run_event(file.events[i], file.data);
        return descriptor.file.data;
    }
    function close(fd) {
        file_descriptors[fd] = undefined;
        c_process.file_descriptors[fd] = undefined;
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
    function statfs(device) {
        let filesystem = get_file(device).filesystem;
        filesystem.usage 
    }
    function chmod(path, permissions) {
        get_file(path).file.permissions = permissions;
    }
    function poll(fd, handler) {
        let event = new Event(handler);
        get_file_descriptor(fd).file.events.push(event.eventid);
        events.push(event);
        c_process.events.push(event.eventid);
        return event.eventid;
    }
    function rmevent(eventid) {
        events[eventid].process.events.splice(event.process.events.indexOf(eventid), 1); // Remove event from parent process
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
        if (typeof filesystem.get_file(0).data !== "object") throw new Error("Filesystem is corrupted.");
        file.is_mountpoint = true;
        file.mountid = mountids;
        filesystem.path = expand_filepath(path);
        filesystem.mountid = mountids++;
        mountpoints.push(filesystem);
    }
    function mount(device, path) {
        // if(file.file.filetype !== "b") throw new Error("Specified file is not a block device.");
        let filesystem = get_file(device).file.data;
        if (filesystem.mountid === undefined) throw new Error("The device " + expand_filepath(device) + " is not a filesystem.");
        fs_mount(filesystem, path);
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
        write(log_fd, "[" + get_time() + "]: " + message + '\n');
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
    let fd;
    fd = open("/dev/devfs", "w");
    write(fd, devfs);
    close(fd);

    let kernelfs_mounts = [];
    let create_kernelfs_mount = function (path) {
        let fd = open("/dev/kernelfs" + kernelfs_mounts.length, "w");
        write(fd, new JSFS()); // Create file reference for filesystem
        close(fd);
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
        fd = open("/proc/uptime", "w");
        write(fd, {});
        close(fd);
    }

    create_kernelfs_mount("/sys");
    create_kernelfs_mount("/tmp");
    create_kernelfs_mount("/var");
    mkdir("/var/log");
    let log_fd = open("/var/log/kernel", "w");

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
        fd = open("/dev/vda", "w");
        write(fd, disk);
        close(fd);

        // First, the driver creates a temporary mountpoint for the disk and mounts it
        mkdir("/mnt");
        mount("/dev/vda", "/mnt");

        // Second, the driver copies all the files specified in initial_filesystem
        log("Copying files from initial_filesystem");
        for (let i = 0; i < initial_filesystem.length; i++) {
            let file = initial_filesystem[i];
            if (file.length < 2)
                mkdir("/mnt" + expand_filepath(file[0]));
            else {
                fd = open("/mnt" + expand_filepath(file[0]), "w");
                write(fd, file[1])
                close(fd);
            }
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
        if(is_permitted(0))
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

    // Kernel power driver
    let cycle_rate = 0;
    let power_manager = function () {
        /* The job of this kernel driver is to only reexecute the kernel if another process is wanting the
           scheduler to be executed, so that it does not run extra, useless cycles. This keeps system efficiency
           Significantly higher and reduces CPU load.
        */
        if (!suspended) {
            let min_exec_time = Infinity;
            let time = get_time();
            for (let i = 0; i < processes.length; i++) {
                let process = processes[i];
                for (let l = 0; l < process.threads.length; l++) {
                    let thread = process.threads[l];
                    if (thread.sleep_time > -1) {
                        let exec_time = thread.last_execution + thread.sleep_time - time;
                        if (exec_time < min_exec_time)
                            min_exec_time = exec_time;
                    }
                }
            }
            if (min_exec_time !== Infinity)
                cycle_rate = Math.max(min_exec_time, 0);
            else
                cycle_rate = 0;
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
    function kill(pid) {
        get_process(pid).dead = true;
    }
    function thread(code) {
        c_process.threads.push(new Thread(code, c_process));
    }
    const average_js_timeout_error = 1.7;
    function sleep(timeout) {
        c_thread.sleep_time = timeout - average_js_timeout_error;
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
    let main = function (static) {
        scheduler();
        power_manager();
        if (panicked === false && !static)
            setTimeout(main, cycle_rate);
    }
    try {
        log("Starting main loop");
        main();
    } catch (e) {
        console.error(e);
        panic("Failed to initialize.");
    }

    // Execute init
    log("Running init");
    exec("/bin/init");
}