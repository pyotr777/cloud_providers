function ready() {
    msg = document.getElementById("messages");
    msg.innerHTML = "Loading data...";
    getRates();
}

document.addEventListener("DOMContentLoaded", ready);

var ndx = null;

function dataLoaded() {
	if (processing) return;
    processing = true;
    ndx = crossfilter(offers_all);
    plotTable();    
    plotScatter();

    dc.renderAll();
    msg.innerHTML = "";
    processing = false;
}

function plotTable() {
	console.log("Plot table");
	//print_filter(offers_all);
	var providerDim = ndx.dimension( function(d) { return d.provider;});
	print_filter(providerDim);
    // DOM for the table
    var datatable   = dc.dataTable("#dc-data-table");
    //
    datatable
        .dimension(providerDim)
        .group( function(d) { return d.provider; })
        .size(Infinity)
        .columns([
        	function(d) { return d.name; },
        	function(d) { return d.gpu_model;},
        	function(d) { return d.cpu_model;},
        	function(d) { return CurrencyFormat(d.hourly_native, d.currency); },
        	function(d) { return CurrencyFormat(d.weekly_native, d.currency); },
        	function(d) { return CurrencyFormat(d.monthly_native, d.currency); },
        	function(d) { return CurrencyFormat(d.yearly_native, d.currency); }
        ]);
}

function plotScatter() {
	console.log("plot scatter");
	var scatterDim = ndx.dimension( function(d) { return [d.cpu_p * d.cpus, d.gpu_p*d.gpus];} );
	console.log("scatterDim: bottom: ");
	console.log(scatterDim.bottom(1));
	console.log("scatterDim: top: ");
	console.log(scatterDim.top(1));
	var min_cpu = scatterDim.bottom(1)[0].cpu_p * scatterDim.bottom(1)[0].cpus;
	var max_cpu = scatterDim.top(1)[0].cpu_p * scatterDim.top(1)[0].cpus;
	var scatterGroup = scatterDim.group();
	var chart = dc.scatterPlot("#dc_scatter");
	chart
		.symbolSize(8)
    	.clipPadding(10)
    	.yAxisLabel("This is the Y Axis!")
		.dimension(scatterDim)
		.group(scatterGroup)
		.x(d3.time.scale().domain([min_cpu,max_cpu]))
}


function print_filter(filter) {
    var f = eval(filter);
    if (typeof(f.top) != "undefined") {
        f=f.top(Infinity);
    }
    if (typeof(f.dimension) != "undefined") {
        f=f.dimension(function(d) { return "";}).top(Infinity);
    }
    console.log("("+f.length+")");
    for (var key in f) {
        if (typeof f[key] === "function") {
            console.log("function "+key);
            continue;
        }
        console.log(f[key]);
    }
    console.log("  * * *");
}