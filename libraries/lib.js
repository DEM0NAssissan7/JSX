function deep_obj(object) {
    // return JSON.parse(JSON.stringify(object));
    return object;
}

{
    var time = Date.now();
    function get_time() {
        return Date.now() - time;
    }
}