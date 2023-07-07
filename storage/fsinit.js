var initial_filesystem = [];
var create_file = function (path, data) {
    if (data)
        initial_filesystem.push([path, data]);
    else
        initial_filesystem.push([path]);
}

/* How to create a file using plain text 

    1. Push a new array to initial_filesystem specifying the path in the first element
    2. If the file is not a directory, put data in the second element
*/