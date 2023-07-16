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