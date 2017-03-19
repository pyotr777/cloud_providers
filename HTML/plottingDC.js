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
	var scatterDim = ndx.dimension( function(d) { 
		var name = d.provider+" "+d.name;
		console.log(name + ":"+d.cpu_p * d.cpus+" TFlops CPU")
		return [ d.cpu_p * d.cpus, d.gpu_p*d.gpus, d.provider, d.name];
	});
	var scatterGroup = scatterDim.group();

	console.log("scatterDim: bottom: ");
	console.log(scatterDim.bottom(1));
	console.log("scatterDim: top: ");
	console.log(scatterDim.top(1));
	//var min_cpu = scatterDim.bottom(1)[0].cpu_p * scatterDim.bottom(1)[0].cpus;
	var min_cpu = 0;
	var max_cpu = scatterDim.top(1)[0].cpu_p * scatterDim.top(1)[0].cpus;
	console.log(min_cpu+" - "+max_cpu);

	var subChart = function(c) {
		return dc.scatterPlot(c)
	    	.symbolSize(10)
		    .highlightedSize(15)
	};

	var chart = dc.scatterPlot("#dc_scatter");
	chart
		//.chart(subChart)
		//.clipPadding(10)
		.symbolSize(10)
    	.yAxisLabel("GPU performance")
    	.xAxisLabel("CPU performance")
		.dimension(scatterDim)
		.group(scatterGroup)
		.x(d3.scale.linear().domain([min_cpu,max_cpu]))
		.brushOn(false)
        .legend(dc.legend().x(70).y(10).itemHeight(13).gap(5))
        .colorAccessor(function(d) {
        	console.log(d);
    		return d.key[0];
  		})
  		.existenceAccessor(function(d) {
  			return d.key[2]+" "+d.key[3];
  		})
  		//.seriesAccessor(function(d) {return d.key[0];})
    	//.keyAccessor(function(d) {return d.key[1];})
    	//.valueAccessor(function(d) {return d.value;})
    	
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