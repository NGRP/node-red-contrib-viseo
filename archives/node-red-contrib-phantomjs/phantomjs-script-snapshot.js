

var system = require('system');
var log = function(msg){
    system.stderr.writeLine(msg);
} 

/*
 * This function wraps WebPage.evaluate, and offers the possibility to pass
 * parameters into the webpage function.
 */
var evaluate = function(page, func) {
    var args = [].slice.call(arguments, 2);
    var fn = "function() { return (" + func.toString() + ").apply(this, " + JSON.stringify(args) + ");}";
    return page.evaluate(fn);
}

try {

    var url  = system.args[1];
    var path = system.args[2];
    var w    = parseInt(system.args[3]);
    var h    = parseInt(system.args[4]);
    var d    = parseInt(system.args[5]);
    var json = JSON.parse(system.args[6]);

    var page = require('webpage').create();

    // viewportSize being the actual size of the headless browser
    page.viewportSize = { width: w, height: h };

    // the clipRect is the portion of the page you are taking a screenshot of
    page.clipRect = { top: 0, left: 0, width: w, height: h };

    // bind browser console
    page.onConsoleMessage = function(msg, lineNum, sourceId) {
        log('Console: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
    };

    // Snapshot function
    var render = function(){
        page.render(path);
        phantom.exit();
    }

    // Open the URL
    page.open(url, function() {
        evaluate(page, function(json) { 
            try { handleData(json); }
            catch(ex){ console.log(ex); 
        } }, json);
        
        if (d > 0){ setTimeout(render, d); } else { render(); }
    });

} catch (ex){
    log('Error in HTML: ' + ex);
    log(ex.stack)
    phantom.exit();
}

