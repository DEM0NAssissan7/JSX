function deep_obj(object) {
    // return JSON.parse(JSON.stringify(object));
    return object;
}

{
    let time = performance.now();
    function get_time() {
        return performance.now() - time;
    }
}