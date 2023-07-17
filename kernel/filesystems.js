/* JSFS filesystem driver 
    This is the filesystem driver for JSFS.
    Using this filesystem driver, you can create a standard JSX
    filesystem that stores data and is guaranteed to work with the JSX kernel.
*/

let JSFS = function () {
    this.path = "/";
    let file = new Inode("/", [], "d", 0, 0);
    file.is_mountpoint = true;
    this.files = [file];
    this.indexes = 1;
    this.mountid = null;
    this.filesystem_type = "JSFS"
}
JSFS.prototype.get_file = function(index) {
    return this.files[index];
}
JSFS.prototype.create_file = function(path, data, filetype, parent_directory) {
    if(parent_directory.filesystem.mountid !== this.mountid) throw new Error("A fatal error occured in the JSFS driver: A file cannot be created in the directory of another filesystem.");
    let index = this.indexes++;

    let relative_path = parent_directory.file.path + "/" + get_filename(path);
    if(parent_directory.file.path === "/") relative_path = "/" + get_filename(path);
    this.files.push(new Inode(relative_path, data, filetype, index, getuid()));
    parent_directory.file.data.push(index);
}
JSFS.prototype.remove_file = function(index) {
    this.files[index] = undefined;
}
JSFS.prototype.mkfs = function(device) {
    if (stat(device).filetype !== "-") throw new Error("JSFS can only be created using normal devices");
    open(path, "w", new JSFS());
}

// Stringify and parse: Important for persistant filesystems
JSFS.prototype.stringify = function() {
    let copy = deep_obj(this);
    let stringified_files = [];
    for(let i = 0; i < this.files.length; i++) {
        let file = this.files[i];
        stringified_files.push(deep_obj(file));
        let type = typeof file.data;
        if(type === "function")
            stringified_files[i].data = file.data.toString();
        console.log(type, file.path);
        stringified_files[i].type = type;
    }
    copy.files = stringified_files;
    copy.mountid = null;
    copy.is_mounted = false;
    copy.path = "/";

    return JSON.stringify(copy);
}
let fs_parse = function(string) {
    let fs = new JSFS();
    let imported_fs = JSON.parse(string);
    for(let i = 0; i < imported_fs.files.length; i++) {
        let file = imported_fs.files[i];
        if(file.type === "function")
            file.data = (new Function("return " + file.data))();
        file.type = undefined;
    }
    fs.path = imported_fs.path;
    fs.files = imported_fs.files;
    fs.indexes = imported_fs.indexes;
    fs.mountid = imported_fs.mountid;
    fs.filesystem_type = imported_fs.filesystem_type;
    return fs;
}