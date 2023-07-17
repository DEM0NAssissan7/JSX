/* JSFS filesystem driver 
    This is the filesystem driver for JSFS.
    Using this filesystem driver, you can create a standard JSX
    filesystem that stores data and is guaranteed to work with the JSX kernel.
*/

let JSFS = function (size) {
    this.path = "/";
    let file = new Inode("/", [], "d", 0, 0);
    file.is_mountpoint = true;
    this.files = [file];
    this.indexes = 1;
    this.mountid = null;
    this.filesystem_type = "JSFS";
    this.size = size;
    this.used_data = 0;
}
JSFS.prototype.get_file = function(index) {
    return this.files[index];
}
JSFS.prototype.create_file = function(path, data, filetype, parent_directory) {
    if(parent_directory.filesystem.mountid !== this.mountid) throw new Error("JSFS driver (fatal): A file cannot be created in the directory of another filesystem.");

    let file_size;
    if(this.size) { // If there is a size quota, check file size and see if it can fit.
        file_size = data_size(data);
        if(file_size + this.used_data > this.size)
            throw new Error("Cannot create file: Space quota will be exceeded.");
        this.used_data += file_size;
    }
    let index = this.indexes++;
    let relative_path = parent_directory.file.path + "/" + get_filename(path);
    if(parent_directory.file.path === "/") relative_path = "/" + get_filename(path);
    this.files.push(new Inode(relative_path, data, filetype, index, getuid(), file_size));
    parent_directory.file.data.push(index);
}
JSFS.prototype.edit_file = function(index, data, mode) {
    let file = this.get_file(index);
    if(mode === "a") {
        if(this.size) { // If there is a size quota, check file size and see if the edit can be made.
            let input_size = data_size(data);
            if(input_size + file.size + this.used_data > this.size)
                throw new Error("Cannot edit file: Space quota will be exceeded.");
            file.size += input_size;
            this.used_data += file.size;
        }
        file.data += data;
    }
    if(mode === "w") {
        if(this.size) { // If there is a size quota, check file size and see if the file can be changed.
            let input_size = data_size(data);
            if(input_size + this.used_data - file.size > this.size)
                throw new Error("Cannot change file: Space quota will be exceeded.");
            this.used_data += input_size - file.size;
            file.size = input_size;
        }
        file.data = data;
    }
}
JSFS.prototype.remove_file = function(index) {
    this.files[index] = undefined;
}
JSFS.prototype.mkfs = function(device) {
    if (stat(device).filetype !== "-") throw new Error("JSFS can only be created using normal devices");
    open(device, "w", "");
    open(device, "w", new JSFS());
}

// Stringify and parse: Important for persistant filesystems
JSFS.prototype.stringify = function() {
    let copy = deep_obj(this);
    let stringified_files = [];
    for(let i = 0; i < this.files.length; i++) {
        let file = this.files[i];
        if(!file) continue;
        stringified_files[i] = deep_obj(file);
        let type = typeof file.data
        if(type === "function")
            stringified_files[i].data = "" + file.data;
        stringified_files[i].typeof = type;
    }
    copy.files = stringified_files;
    copy.mountid = null;
    copy.is_mounted = false;
    copy.path = "/";

    return JSON.stringify(copy);
}
JSFS.prototype.get_real_size = function() {
    return data_size(this.stringify());
}

let fs_parse = function(string, filesystem) {
    let fs = new filesystem();
    let imported_fs = JSON.parse(string);
    for(let i = 0; i < imported_fs.files.length; i++) {
        let file = imported_fs.files[i];
        if(file.typeof === "function")
            file.data = (new Function("return " + file.data))();
        file.typeof = undefined;
    }
    fs.path = imported_fs.path;
    fs.files = imported_fs.files;
    fs.indexes = imported_fs.indexes;
    fs.mountid = imported_fs.mountid;
    fs.filesystem_type = imported_fs.filesystem_type;
    fs.size = imported_fs.size;
    fs.used_data = imported_fs.used_data;
    return fs;
}