let Inode = function(path, data, filetype, index, user, size) {
    this.index = index;
    this.path = path;
    this.filename = path;
    let filename = get_filename(path);
    if(filename.length !== 0) this.filename = filename;
    this.data = data;
    this.size = size;
    this.filetype = filetype;
    this.owner = user;
    this.permissions = 664;
    this.is_mountpoint = false;
    this.mountid = null;
    this.events = [];
}