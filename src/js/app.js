import * as d3B from 'd3'
import * as d3Select from 'd3-selection'
import * as d3geo from 'd3-geo'
import * as d3drag from 'd3-drag'
import * as topojson from 'topojson'
import * as d3GeoProjection from "d3-geo-projection"
import textures from 'textures'
import {event as currentEvent} from 'd3-selection';
import { $ } from "./util"
import * as d3Jetpack from 'd3-jetpack'
import * as d3Swoopydrag from 'd3-swoopy-drag'
import { showcaseAnn, articleAnn } from '../assets/annotations.js?0'

let d3 = Object.assign({}, d3B, d3Select, d3geo, d3drag, d3GeoProjection, d3Jetpack, d3Swoopydrag);
const boroughsURL = "<%= path %>/assets/boroughs.json";
const murdersURL = "<%= path %>/assets/new homicide sheet - Latest.csv";

const spreadsheet = "https://interactive.guim.co.uk/docsdata-test/1erOIBZw9NPHIW2IaTVox8Z8XfeKr7hMim31i183RZhA.json"

let padding = 12;

const mapEl = $(".murders-type");

const monthsString = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const affectedBoroughs = [];
const boroughsLabels = ['Harrow', 'Hillingdon', 'Barnet', 'Enfield', 'Havering','Bexley','Bromley','Croydon','Sutton','Merton','Hounslow','Ealing'];

let width = mapEl.getBoundingClientRect().width - padding;
let height = width*(711 / 860) - padding;
let isMobile



if(width < 600)
{
	isMobile = true
}
else
{
	isMobile = false
}
let active = d3.select(null);

let murdersMap = d3.select(".murders-type")
.append("svg")
.attr("width", width)
.attr("height", height)


let smallMultiples = d3.select("#interactive-slot-1")

let projection = d3.geoMercator()

let path = d3.geoPath()
.projection(projection);

let voronoi = d3.voronoi()
.extent([[-1, -1], [width + 1, height + 1]]);

let boroughs;
let boroughsMerged;
let murders;

Promise.all([
	d3.json(boroughsURL),
	d3.json(spreadsheet)
	])
.then(ready)


function ready(data)
{
	boroughs = topojson.feature(data[0], data[0].objects['boroughs']);
	boroughsMerged = topojson.merge(data[0], data[0].objects['boroughs'].geometries);
	murders = data[1].sheets.Latest;

	let stabbings = murders.filter(m => m.Method == 'Stabbed');
	let shootings = murders.filter(m => m.Method.indexOf('Shot') != -1);
	let boroughsTotal = [];
	let murdersBorough = [];

	d3.select(".murders-standfirst-number").html(murders.length)
	d3.select(".murders-standfirst-stabbings").html(stabbings.length)
	d3.select(".murders-standfirst-shootings").html(shootings.length)
	d3.select(".murders-standfirst-others").html(murders.length - (stabbings.length + shootings.length))

	murders.map(m => boroughsTotal.push(m.Borough))

	boroughsTotal.sort()

	let current = null;
    let cnt = 0;
    for (let i = 0; i < boroughsTotal.length; i++) {
        if (boroughsTotal[i] != current) {
            if (cnt > 0) {
                murdersBorough.push({borough:current, murders:cnt});
            }
            current = boroughsTotal[i];
            cnt = 1;
        } else {
            cnt++;
        }
    }

    murdersBorough.sort(function(a,b){return b.murders - a.murders})

//THIS MAKES THE WORSE 3 BOROUGHS HIGHLIGHT---------------------------------------------
//
//Just add or delete murdersBorough[position].borough in this array to alter highlighted boroughs on the map
//
//
    affectedBoroughs.push(murdersBorough[0].borough, murdersBorough[1].borough, murdersBorough[2].borough)
//
//
//--------------------------------------------------------------------------------------

	makeMainMap()
	makeSmallMultiples()
	makeAnnotations()
}

window.onresize = function(event)
{
	width = mapEl.getBoundingClientRect().width - padding;
	height = width*(711 / 860) - padding;

	if(width - padding < 600)
	{
		isMobile = true
	}
	else
	{
		isMobile = false
	}

	murdersMap.attr('width', width)
	murdersMap.attr('height', height)
	makeMainMap()
	makeSmallMultiples()
	makeAnnotations()
}

function makeAnnotations()
{
	let annotations;
	let annotationsText;
	if(width > 688) { annotations=showcaseAnn; annotationsText="showcaseAnn";}
	else if(width <= 688 && width > 608)  {annotations=articleAnn; annotationsText="articleAnn";}

	console.log('The size of annotations currently is ', annotationsText)

	if(annotations)
	{
		d3.select('#markerDefs').remove()
		
		let swoopyDrag = d3.swoopyDrag()
	    .draggable(false)
	    .x(d => d.annWidth )
	    .y(d => d.annLenght)
	    .annotations(annotations)
	    .on('drag', function(event){
	    	window.annotations = annotations;
	    })

	    let swoopy = murdersMap.append('g')
	    .attr('class', 'swoopy')
	    .call(swoopyDrag)

	    swoopy.selectAll('path')
	    .style('stroke', 'black')
	    .style('fill', 'none')
	    .style('stroke-width', '1px');

	   	let swoopyTexts = swoopy.selectAll('text').nodes()
	    d3.select(swoopyTexts[0]).attr('class', 'annotation-headline')
	    d3.select(swoopyTexts[1]).attr('class', 'annotation-text')
	    d3.select(swoopyTexts[2]).attr('class', 'annotation-headline')
	    d3.select(swoopyTexts[3]).attr('class', 'annotation-text')
	   
	   

	    swoopy.selectAll('text')
	    .each(function(d){

	    	let vertical;
	    	let horizontal;

	    	if(d.class == 'headline'){vertical = 22; horizontal = 20;}
	    	else{vertical = 18; horizontal = 18;}
	      d3.select(this)
	          .text('')//clear existing text
	          .tspans(d3.wordwrap(d.text, horizontal), vertical)//wrap after 20 char
	    });

	    let markerDefs = murdersMap.append('svg:defs')
	    .attr('id', "markerDefs");

	    markerDefs.append('marker')
	    .attr('id', 'arrow')
	    .attr('viewBox', '-10 -10 20 20')
	    .attr('markerWidth', 20)
	    .attr('markerHeight', 20)
	    .attr('orient', 'auto')
	  	.append('path')
	    .attr('d', 'M-4.75,-4.75 L 0,0 L -4.75,4.75')
	    .style('fill', 'black')

	    

	    swoopy.selectAll('path')
	    .attr('marker-end', 'url(#arrow)');
	}
}

function makeSmallMultiples()
{
	smallMultiples.selectAll('div').remove();

	let months = []
	let positionsByMonth = []
	let positionsAcumm = []

	murders.map(m => {
		let month = +m.Date.split('-')[1]
		let day = +m.Date.split('-')[2]
		let date = new Date(2018, month -1, day)
		if(months.indexOf(date.getMonth()) == -1){
			months.push(date.getMonth())
			positionsByMonth[date.getMonth()] = []
		}

		positionsByMonth[date.getMonth()].push(m)	

	})

	months.reverse()

	months.map((m,i) => {
		

		let divWidth =0;
		let divHeight = 0;

		if(isMobile){divWidth = 140; divHeight = (140 *154) / 200;}
		else{divWidth=200; divHeight = 154;}

		let div = smallMultiples.append('div')
		.attr('class', 'small-multiple-wrapper')

		let total = div.append('div')
		.attr('class', 'small-multiple-total')
		.html(positionsByMonth[m].length)

		let month = div.append('div')
		.attr('class', 'small-multiple-month')
		.html(monthsString[m])

		let map = div.append('svg')
		.attr('width',divWidth)
		.attr('height',divHeight)

		projection.fitSize([divWidth, divHeight], boroughs);

		map.selectAll('.borough')
		.data(boroughs.features)
		.enter()
		.append('path')
		.attr('d', path)
		.attr('class', 'borough-small-multiples')

		map
		.append('path')
		.datum(boroughsMerged)
		.attr('d', path)
		.attr('class', 'outline-small-multiples')

		let positions = []

		map.selectAll(".small-multiples-circle-past")
		.data(positionsAcumm)
		.enter()
		.append('circle')
		.attr('class', "small-multiples-circle-past")
		.attr('cx', d => d.cx)
		.attr('cy', d => d.cy)
		.attr('r', d => d.r);

		positionsByMonth[m].map(p => {

			positions.push({
				cx: projection([+p.long, +p.lat])[0],
				cy: projection([+p.long, +p.lat])[1],
				r:3
			})

			positionsAcumm.push({
				cx: projection([+p.long, +p.lat])[0],
				cy: projection([+p.long, +p.lat])[1],
				r:3
			})

		})

		map.selectAll(".small-multiples-circle")
		.data(positions)
		.enter()
		.append('circle')
		.attr('class', "small-multiples-circle")
		.attr('cx', d => d.cx)
		.attr('cy', d => d.cy)
		.attr('r', d => d.r);
		
	})
}

function makeMainMap()
{
	murdersMap.selectAll('path').remove()
	murdersMap.selectAll('circle').remove()
	murdersMap.selectAll('text').remove()

	projection.fitSize([width, height], boroughs);

	let texture = textures.lines()
	.size(4)
	.stroke("#dadada")
	.strokeWidth(1);

	murdersMap.call(texture)

	murdersMap.selectAll('.borough')
	.data(boroughs.features)
	.enter()
	.append('path')
	.attr('d', path)
	.attr('class', d => 'borough ' + d.properties.name)
	.style("fill", d => {if(affectedBoroughs.indexOf(d.properties.name) != -1 && !isMobile) return texture.url()})
	.style("stroke-width", d => {if(affectedBoroughs.indexOf(d.properties.name) != -1 && !isMobile) return '1.2px'})

	murdersMap.selectAll('text')
	.data(boroughs.features)
	.enter()
	.filter(d => boroughsLabels.indexOf(d.properties.name) != -1 && !isMobile)
	.append('text')
	.text(d => d.properties.name)
	.attr('transform', d => 'translate(' + path.centroid(d) + ')')
	.attr('class', 'borough-label')
	.attr('text-anchor', 'middle')
	
	
	murdersMap
	.append('path')
	.datum(boroughsMerged)
	.attr('d', path)
	.attr('class', 'outline-main-map')

	let positions = [];
	let points = [];

	murders.map(m => {

		let className = m.Method + " " + m.Victim;
		let radius = 3;

		if(m.Method.indexOf('Shot') != -1 || m.Method == 'Stabbed')
		{
			className = m.Method + " " + m.Victim
		}
		else
		{
			className = 'other' + " " + m.Victim
		}

		if(width > 400)
		{
			if(m.Method == 'Shot') radius = 6.1325
				else radius =  6.875
			}
		else radius =  3

			positions.push({
				cx: projection([+m.long, +m.lat])[0],
				cy: projection([+m.long, +m.lat])[1],
				className: className,
				r:radius,
				name: m.Victim,
				age: m.Age,
				date: m.Date,
				borough: m.Borough,
				method: m.Method
				
			})

		points.push(projection([+m.long, +m.lat]))

	})

	let circles = murdersMap.selectAll("circle")
	.data(positions)
	.enter()
	.append('circle')
	.attr('cx', d => d.cx)
	.attr('cy', d => d.cy)
	.attr('class', d => d.className)
	.attr('id', (d,i) => "c"+i)
	.attr('r', d => d.r)

	const polygons = voronoi(points).polygons();

	let tooltip = d3.select(".tooltip")
	let tName = d3.select(".tooltip-name")
	let tAge = d3.select(".tooltip-age")
	let tDate= d3.select(".tooltip-date")
	let tBorough = d3.select(".tooltip-borough")
	let tMethod = d3.select(".tooltip-method")

	murdersMap.selectAll(".cell")
	.data(polygons)
	.enter()
	.append("path")
	.attr("class", "cell")
	.attr("opacity", 0)
	.attr("stroke", "black")
	.attr("d", (d,i) => {return "M" + d.join("L") + "Z"})
	.on('mouseover', (d,i) => {
		d3.select('.tooltip').classed(" over", true)
		d3.select('#c' + i).classed(" over", true)
		tName.html(positions[i].name)
		tAge.html(positions[i].age + " years old")
		tDate.html(positions[i].date.split("-")[2] + ' ' + monthsString[positions[i].date.split("-")[1] - 1])
		tBorough.html(positions[i].borough)
		tMethod.html(positions[i].method)
	})
	.on('mouseout', d => {
		d3.select('.tooltip').classed(" over", false)
		murdersMap.select(".over").classed(" over", false)
	})
	.on("mousemove", mousemove)

	function mousemove(event) {

	  	let marginLeft = mapEl.getBoundingClientRect().left;
	  	let marginTop = mapEl.getBoundingClientRect().top;

	    tooltip.style('left', d3.mouse(this)[0] + padding + 'px')
	    tooltip.style('top', d3.mouse(this)[1] + padding + 'px')

	    let tWidth = +tooltip.style("width").split('px')[0]
	    let tLeft = +tooltip.style("left").split('px')[0]

	    if(tLeft + tWidth > width - padding)
	    {
	    	tooltip.style('left', width - tWidth - padding + 'px')
	    }
	}
}

