function ready() {
    msg = document.getElementById("messages");
    msg.innerHTML = "Loading data...";
    getRates();
}

document.addEventListener("DOMContentLoaded", ready);

var ndx = null;
var quotes=[];
var step = 24; // hours step
var plot_period = 1; // months for plot "cost for rent period"

function dataLoaded() {
	if (processing) return;
    processing = true;
    ndx = crossfilter(offers_all);
    plotTable();    
    plotScatter();
    plotPieGPUs();
    plotPeriod(getHours4Months(plot_period), step);  // Period for top plot
    console.log("Have "+ quotes.length+" quotes.")

    dc.renderAll();
    msg.innerHTML = "";
    processing = false;
}

function plotTable() {
	console.log("Plot table");
	//print_filter(offers_all);
	var providerDim = ndx.dimension( function(d) { return d.provider;});
	//print_filter(providerDim);
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
        	function(d) { return d.gpus;},
        	function(d) { return d.gpu_p;},
        	function(d) { return d.cpu_model;},
        	function(d) { return d.cpus;},
        	function(d) { return d.cpu_p;},
        	function(d) { return CurrencyFormat(d.hourly_native, d.currency); },
        	function(d) { return CurrencyFormat(d.weekly_native, d.currency); },
        	function(d) { return CurrencyFormat(d.monthly_native, d.currency); },
        	function(d) { return CurrencyFormat(d.yearly_native, d.currency); }
        ]);
}

function plotPieGPUs() {
	console.log("Plot GPU numbers pie");
	var GPUsDim = ndx.dimension( function(d) { return d.gpus;});
	var gpus_total = GPUsDim.group();
	var GPUs_pie_chart = dc.pieChart("#dc_pie_gpus");
	GPUs_pie_chart
		.width(200).height(200)
		.dimension(GPUsDim)
		.group(gpus_total)
		.innerRadius(60)
		.legend(dc.legend().x(80).y(70).itemHeight(13).gap(5));

}

function plotScatter() {
	console.log("plot scatter");
	var scatterDim = ndx.dimension( function(d) { 
		var name = d.provider+" "+d.name;
		//console.log(name + ":"+d.cpu_p * d.cpus+" TFlops CPU")
		return [ d.cpu_p, d.gpu_p, d.provider, d.name];
	});
	var scatterGroup = scatterDim.group();

	console.log("scatterDim: bottom: ");
	console.log(scatterDim.bottom(1));
	console.log("scatterDim: top: ");
	console.log(scatterDim.top(1));
	//var min_cpu = scatterDim.bottom(1)[0].cpu_p * scatterDim.bottom(1)[0].cpus;
	var min_cpu = 0;
	var max_cpu = scatterDim.top(1)[0].cpu_p;
	console.log(min_cpu+" - "+max_cpu);

	
	var chart = dc.scatterPlot("#dc_scatter_performance");
	chart
		.symbolSize(10)
    	.yAxisLabel("GPU performance")
    	.xAxisLabel("CPU performance")
		.dimension(scatterDim)
		.group(scatterGroup)
		.x(d3.scale.linear().domain([min_cpu,max_cpu]))
		.brushOn(false)
        //.legend(dc.legend().x(10).y(10).itemHeight(10).gap(5))
        .colorAccessor(function(d) {
        	//console.log(d);
        	if (typeof d === "undefined") return;
    		return d.key[2];
  		})
  		.existenceAccessor(function(d) {
  			return d.key[2]+" "+d.key[3];
  		})
}


// Plot all offers costs for given period.
function plotPeriod(period, step) {
	console.log("Plot period for " + period+ " hours");
    for (var i=0; i <= period; i+=step) {
	    for (var j=0; j < offers_all.length; j++) {
	    	var offer = {
	    		provider: offers_all[j].provider,
	    		name: offers_all[j].name,
	    		shortname: offers_all[j].shortname
	    	};
	        cost = getQuote4Hours(offers_all[j], i);
	        offer["h"] = i;
	        offer["cost"] = cost;
	        quotes.push(offer);
	        console.log(offer);
	    }
	}
	//print_filter(quotes);
	var cost_chart = dc.seriesChart("#dc_cost");
	var ndx = crossfilter(quotes);
	cost_dim = ndx.dimension( function (d) { return [d.h, d.name]; });
	cost_grp = cost_dim.group().reduceSum( function (d) { return d.cost;});
	cost_chart
    	.width(768)
    	.height(480)
    	.chart(function(c) { return dc.lineChart(c).interpolate('basis'); })
    	.x(d3.scale.linear().domain([0,800]))
    	.brushOn(false)
    	.yAxisLabel("Cost")
    	.xAxisLabel("Hours")
    	.clipPadding(10)
    	.elasticY(true)
    	.dimension(cost_dim)
    	.group(cost_grp)
    	.seriesAccessor(function(d) {
	    	console.log(d);
	    	return "offer: " + d.key[1];
	    })
    	.keyAccessor(function(d) {return +d.key[0];})
    	.valueAccessor(function(d) {return +d.value;})
    	
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