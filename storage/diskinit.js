// Disk initialization driver. Necessary for proper boot.
// This driver imports the preset files set at the beginning of the program and stores the filesystem in the disk variable.
let jsx_system = new JSFS();

// Copy all the files specified in initial_filesystem
function getuid(){return 0;}
for (let i = 0; i < initial_filesystem.length; i++) {
    let file = initial_filesystem[i];
    let parent_file;
    try{
        parent_file = jsx_system.get_file(jsx_system.get_index_by_path(file[0]));
    } catch (e) {
        console.error("Unable to create " + file[0] + ": " + e);
    }
    if (file.length < 2)
        jsx_system.create_file(file[0], [], "d", parent_file);
    else
        jsx_system.create_file(file[0], file[1], "-", parent_file);
}
getuid = undefined;