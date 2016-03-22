/* Scripts by Tobin McGilligan, 2016 */

//execute script when window is loaded
window.onload = function() {

    //map frame dimensions
    var width = 820,
        height = 480;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    var projection = d3.geo.conicConformal()
        .rotate([98, 0])
        .center([0, 38])
        .parallels([29.5, 45.5])
        .scale(1000)
        .translate([width / 2, height / 2])
        .precision(.1);

    var path = d3.geo.path()
        .projection(projection);

    //use queue.js to parallelize asynchronous data loading
    d3_queue.queue()
        .defer(d3.csv, "data/SnapshotPrivateManufacturingStats2014.csv") //load attributes from csv
        .defer(d3.json, "data/contiguous48_multipart_singlepart.topojson") //load choropleth spatial data
        .await(callback);

    function callback(error, csvData, unitedStates) {
        //translate europe TopoJSON
        var usaStates = topojson.feature(unitedStates, unitedStates.objects.contiguous48_multipart_singlepart).features;

        //examine the results
        console.log(usaStates);

        var graticule = d3.geo.graticule()
            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule

        //create graticule lines    
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines

        //add states to map
        var regions = map.selectAll(".states")
            .data(usaStates)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.adm1_code;
            })
            .attr("d", path);
    };


};