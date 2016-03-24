/* Scripts by Tobin McGilligan, 2016 */

//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

    //pseudo-global variables
    var attrArray = [ //variables for data join
        "num_employees_per_thousand_pop",
        "num_businesses_per_thousand_pop",
        "total_wages_dollars_per_100dollars_GDP",
        "avg_annual_pay",
        "avg_weekly_wage",
    ];
    var attrOptions = [
        {
            title: "Employees",
            subtitle: "per Total Employed Workers",
            units: "",
        },
        {
            title: "Businesses",
            subtitle: "per Total Employed Workers",
            units: "",
        },
        {
            title: "Total Wages Payed Out",
            subtitle: "per $100 Gross Domestic Product",
            units: "$",
        },
        {
            title: "Mean Annual Pay",
            subtitle: "for Salaried Workers",
            units: "$",
        },
        {
            title: "Mean Weekly Pay",
            subtitle: "for Hourly Workers",
            units: "$",
        },
    ];
    var expressed = 4; //initial attribute (an index)

    //execute script when window is loaded
    window.onload = function() {

        //map frame dimensions
        var width = window.innerWidth * 0.45,
        height = 300;

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
            .scale(550)
            .translate([width / 2, height / 2])
            .precision(.1);

        var path = d3.geo.path()
            .projection(projection);

        //use queue.js to parallelize asynchronous data loading
        d3_queue.queue()
            .defer(d3.csv, "data/SnapshotPrivateManufacturingStats2014.csv") //load attributes from csv
            .defer(d3.json, "data/contiguous48_multipart_singlepart_simp.topojson") //load choropleth spatial data
            .await(callback);

        function callback(error, csvData, unitedStates) {

            //translate TopoJSON
            var usaStates = topojson.feature(unitedStates, unitedStates.objects.contiguous48_multipart_singlepart).features;

            //setGraticule(map, path);
            joinData(usaStates, csvData);

            //create the color scale
            var colorScale = makeColorScale(csvData);

            //add states to map
            var states = map.selectAll(".states")
                .data(usaStates)
                .enter()
                .append("path")
                .attr("class", function(d){
                    return "states " + d.properties.adm1_code;
                })
                .attr("d", path)
                .style("fill", function(d){
                    return choropleth(d.properties, colorScale);
                });

            setChart(csvData, colorScale);
        };
    };

    function choropleth(d, colorScale) {
        //make sure attribute value is a number
        var val = parseFloat(d[attrArray[expressed]]);
        //if attribute value exists, assign a color; otherwise assign gray
        if (val && val != NaN) {
            return colorScale(val);
        } else { return "#CCC"; };
    }

    function setGraticule(map, path) {
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
    };

    function joinData(usaStates, csvData) {
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<csvData.length; i++){
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.adm1_code; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var j=0; j<usaStates.length; j++){

                var geojsonProps = usaStates[j].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.adm1_code; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){
                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
    };

    //function to create color scale generator
    function makeColorScale(data){

        var domainArray = [];
        var colorClasses = [
            "#c6dbef",
            "#9ecae1",
            "#6baed6",
            "#3182bd",
            "#08519c"
        ];

        //create color scale generator
        var colorScale = d3.scale.threshold/*quantile*/()
            .range(colorClasses);

        // Quantile Classed Scale
        //build array of all values of the expressed attribute
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][attrArray[expressed]]);
            domainArray.push(val);
        };

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        /*// Equal Interval Scale
        //build two-value array of minimum and maximum expressed attribute values
        var minmax = [
            d3.min(data, function(d) { return parseFloat(d[attrArray[expressed]]); }), 
            d3.max(data, function(d) { return parseFloat(d[attrArray[expressed]]); })
        ];

        //assign two-value array as scale domain, this turns the quantile scale into equal interval
        colorScale.domain(minmax);*/

        // Natural Breaks Scale
        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        //remove first value from domain array to create class breakpoints
        domainArray.shift();

        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);

        return colorScale;
    };

    function setChart(csvData, colorScale) {
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.475,
            chartHeight = 306,
            leftPadding = 50,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //create a scale to size bars proportionally to frame
        var min = d3.min(csvData, function(d) { return parseFloat(d[attrArray[expressed]]); });
        var max = d3.max(csvData, function(d) { return parseFloat(d[attrArray[expressed]]); });

        var yScale = d3.scale.linear()
            .range([chartInnerHeight, 0])
            .domain([min-(min*0.3), max+(max*0.05)]);

        //set bars for each state
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[attrArray[expressed]]-a[attrArray[expressed]];
            })
            .attr("class", function(d){
                return "bars " + d.adm1_code;
            })
            .attr("width", chartInnerWidth / (csvData.length+1) - 1)
            .attr("x", function(d, i){
                return (i+0.5) * (chartInnerWidth / (csvData.length+1)) + leftPadding;
            })
            .attr("height", function(d){
                return chartInnerHeight - yScale(parseFloat(d[attrArray[expressed]]));
            })
            .attr("y", function(d){
                return yScale(parseFloat(d[attrArray[expressed]])) + topBottomPadding;
            })
            .style("fill", function(d){
                return choropleth(d, colorScale);
            });

        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", chartWidth - 20 - rightPadding)
            .attr("y", 40 + topBottomPadding)
            .attr("text-anchor", "end")
            .attr("class", "chartTitle")
            .text(attrOptions[expressed].title);

        //create a text element for the chart subtitle
        var chartSubtitle = chart.append("text")
            .attr("x", chartWidth - 20 - rightPadding)
            .attr("y", 60 + topBottomPadding)
            .attr("text-anchor", "end")
            .attr("class", "chartSubtitle")
            .text(attrOptions[expressed].subtitle);

        //create vertical axis generator
        var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient("left")
            .outerTickSize([0]) //removes outer ticks
            .tickFormat( function(d) { // formats ticks
                return attrOptions[expressed].units + d;
            });

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        /*//annotate bars with attribute value text
        var numbers = chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .sort(function(a, b){
                return a[attrArray[expressed]]-b[attrArray[expressed]]
            })
            .attr("class", function(d){
                return "numbers " + d.adm1_code;
            })
            .attr("text-anchor", "middle")
            .attr("x", function(d, i){
                var fraction = chartWidth / csvData.length;
                return i * fraction + (fraction - 1) / 2;
            })
            .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d[attrArray[expressed]])) + 15;
            })
            .text(function(d){
                return d[attrArray[expressed]];
            });*/
    }

})(); //last line of main.js