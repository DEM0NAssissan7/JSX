function deep_obj(object) {
    return JSON.parse(JSON.stringify(object));
    // return object;
}

{
    let time = performance.now();
    function get_time() {
        return performance.now() - time;
    }
}
let map_path_names = function (path) {
    let file_string = "";
    let string_list = [];
    for (let i = 0; i < path.length; i++) {
        let char = path[i];
        switch (char) {
            case "/":
                if (file_string.length !== 0)
                    string_list.push(file_string);
                file_string = "";
                continue;
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
                }
                break;
        }
        file_string += char;
    }
    if (file_string.length !== 0)
        string_list.push(file_string);
    return string_list;
}
let get_filename = function(path) {
    let filename = "";
    for (let i = 0; i < path.length; i++) {
        let char = path[i];
        if (char === "/") {
            filename = "";
            continue;
        }
        filename += char;
    }
    if(filename.length !== 0) return filename;
    return path;
}
let to_string = function(data) {
    let type = typeof data;
    if(type === "function")
        return data.toString();
    else return JSON.stringify(data);
}
let data_size = function(data) {
    return (new TextEncoder().encode(to_string(data))).length
}
let clear_cookies = function() {
    const cookies = document.cookie.split(";");

    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
}