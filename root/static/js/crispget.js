var $j = jQuery.noConflict();

jQuery(document).ready(function ($) {

  $('[data-toggle="tooltip"]').tooltip();

	//safari_alert();

	var score_array;
	var seq_length;
	var bt2_file;
	var best_start;
	var best_end;
	var best_seq;
	var expr_msg;
	var expr_f;
	var ids;
	var m_aoa;
	var temp_file;
	var n_mer;


	var seq;
	var mm; 
	var guide_length;
	var g_rna; 
	var align_tool; 
	var ref_gen_ext; 

	//start the tool when click on Run CRISPGET Analysis
	$('#run_crispr_tool').click(function () {
/*
		//get the expression file from the web input form
		expr_f = $('#expression_file').val();
		$("#region_square").css("height","0px");

		//submit the form
		$("#upload_expression_form").submit();
		*/

		
		//get the arguments from the HTML elements
		seq = $("#sequence").val();
		mm = $("#mm").val();
		db = $("#bt2_db").val();
		g_rna = $("#g_rna").val();
		align_tool = $("#align_tool").val();
		ref_gen_ext = $("#ref_gen_ext").val();


		//Edit variables according to options
		console.log(g_rna);
		if (g_rna ==="20bp-NGG"){
			guide_length = 23; 
		}

		console.log(align_tool); 

		if (align_tool ==="Bowtie"){
			//Run Bowtie2
			runBt2(guide_length, mm,g_rna,align_tool, db);
		}
  });
  // sent the data to the controller to run bowtie2 and parse the results
	function runBt2(guide_length, mm,g_rna,align_tool, db) {
		var db_name;

		$("#no_results").html("");
		// alert("seq: "+seq.length+", si_rna: "+si_rna+", f_length: "+f_length+", mm: "+mm+", db: "+db+", expr_file: "+expr_file);
		$.ajax({
			url: '/crispget/result/',
			// async: false,
			timeout: 600000,
			method: 'POST',
			data: { 'sequence': seq, 'guide_length': guide_length, 'mismatch': mm, 'guide':g_rna, 'align_tool':align_tool, 'database': db },

			beforeSend: function(){
				disable_ui();
			},
			success: function(response) {
				if (response.error) {
					alert("ERROR: "+response.error);
					enable_ui();
				} else {
					db_name = response.db_name;
					bt2_file = response.jobid;

					seq = response.input_sequence; 

					input_sequence_file = response.query_file; 
					console.log(input_sequence_file); 

					$("#help_fsize").val(guide_length);
					$("#help_nmer").val(guide_length);
					$("#help_mm").val(mm);
					$("#db_name").val(db_name);
					console.log("Bowtie 2 done"); 

					getResults(1, bt2_file, guide_length, mm, db, align_tool);
				}
			},
			error: function(response) {
				alert("An error occurred. The service may not be available right now. Bowtie2 could not be executed");
				//safari_alert();
				enable_ui();
			}
		});
	}


function getResults(status, bt2_res, guide_length, mm, db,align_tool) {

		var t_info = "<tr><th>Gene</th><th>Matches</th><th>Functional Description</th></tr>";
		$("#no_results").html("");

		$.ajax({
			url: '/crispget/view/',
			async: true,
			timeout: 6000000,
			method: 'POST',
			data: {'id': bt2_res, 'sequence': seq, 'guide_length': guide_length, 'mismatch': mm, 'guide':g_rna, 'align_tool':align_tool, 'database': db,'ref_gen_ext':ref_gen_ext },
			complete: function(){
				enable_ui();
				hide_ui();
			},
			success: function(response) {
				if (response.error) {
					alert("ERROR: "+response.error);
					enable_ui();
				} else {

					//assign values to global variables
					/*
					score_array = response.all_scores;
					best_seq = response.best_seq;
					expr_msg = response.expr_msg;
					var best_score = response.score;
					var best_start = response.cbr_start;
					var best_end = response.cbr_end;
					coverage = response.coverage;
					ids = response.ids;
					m_aoa = response.matches_aoa;
					*/

					var line_length = response.line_length; 
					sequence = response.query_seq;
					var seq_length = sequence.length;
					var guide_list = response.guides; 
					//alert(typeof(guide_list)); 
					//alert(sequence); 
					console.log(sequence); 
					//alert(line_length);

					

					var data = {
						"sequence": sequence, 
						"guide_list": guide_list, 
						"line_length": line_length, 
					};
					results_view(sequence,guide_list,line_length); 


					//.......................Output view.......................
					
					//.......................Output end.......................
				
					
				}
			},
			error: function(response) {
				alert("An error occurred. The service may not be available right now.");
				//safari_alert();
				enable_ui();
			}
		});
		/*
		console.log("Hey hey my info"); 
		console.log(data); 
		if (data){
			results_view(data); 
		}*/
		
	}

  

	 function  results_view(sequence,guide_list,line_length){

		$(".subsection_bar").css("display","");
		$("#results_section").css("display","");


		console.log(typeof data); 


		console.log(sequence); 
		console.log(guide_list); 
		console.log(line_length); 

		guide_list = JSON.parse(guide_list); 
		
		
		const font_size = 20; 
		const width = window.innerWidth; 
		const height = window.innerHeight; 

			
		//Create scalar gradients
		var mit_colors = d3.scaleQuantize()
		.domain([0,100])
		.range(["#f10e0e","#f1370f","#f16010","#f28811","#f2b112","#f2d912","#e4f213","#bdf314","#96f315","#6ff316"]);

		var cfd_colors =d3.scaleQuantize()
		.domain([0,100])
		.range(["#f10e0e","#f1370f","#f16010","#f28811","#f2b112","#f2d912","#e4f213","#bdf314","#96f315","#6ff316"]);

		// Upper view ( possible guides)
		const guides_div = d3.select('body').select('.guides_div').select('.inner_content');

		const svg = guides_div.append('svg');
		//Not completely defined
		//svg.attr('display','flex');
		svg.attr('padding','5px'); 
		svg.attr('class','guides_svg'); 
		//svg.attr('viewBox',"0 0 1 1");

		//svg.attr('height','100%');
		//svg.attr('width','100%');

		//Group of inputsequence ( grey rectangle and input sequence)
		const input_sequence_group = svg.append('g')


		const grey_sequence_rect = input_sequence_group.append('rect').attr('class','sequence_gray_rect')
		.attr('border','2px')
		.attr('rx','5px')
		.attr('ry','5px')
		.attr("x", 0)
		.attr("y", 0)
		.attr("fill", "#C9C9C9");

		//Input sequence text
		const sequence_text = input_sequence_group.append('text')
		.attr('x',0)
		.attr('font-size',font_size)
		.text(sequence);
		//Set start according to font-size
		sequence_text.attr('y',sequence_text.node().getBoundingClientRect().height/1.3)

		console.log(guide_list);
		console.log(sequence_text.node());
		console.log()
		//guides_div.attr('width',sequence_text.node().getBoundingClientRect().width);
		svg.attr('width',sequence_text.node().getBoundingClientRect().width);

		svg.attr('height',(sequence_text.node().getBoundingClientRect().height/2*guide_list.length));

		grey_sequence_rect.attr("height", sequence_text.node().getBoundingClientRect().height);
		grey_sequence_rect.attr("width", sequence_text.node().getBoundingClientRect().width); 



		//////////Possible guides///////////
		//Change i to update the x initial position for the variable ones
		var i = 2;
		var o = 0; 
		//Possible guides (from red to green color based on worse performance) -Other group
		const possible_guides_group = svg.append('g').attr('class','poss_guides_group')
		.selectAll('rect')
		.data(guide_list)
		.enter()
		.append('rect')
		.attr('y',function(dta){
		const result =(dta.line+i)*sequence_text.node().getBoundingClientRect().height; 
		return result})
		.attr('x',(dta)=>sequence_text.node().getStartPositionOfChar(dta.start_guide).x)
		.attr('width',(dta)=>(sequence_text.node().getStartPositionOfChar(dta.end_guide).x-sequence_text.node().getStartPositionOfChar(dta.start_guide).x))
		.attr('height',sequence_text.node().getBoundingClientRect().height/2)
		.attr('rx','5px')
		.attr('ry','5px')
		.attr('fill', function(data){

		console.log(o.toString()+" "+data.sequence);
		o+=1; 
		var color_rect; 
		if (data.MIT_score <data.CFD_score){
			color_rect = mit_colors(data.MIT_score); 
		}else{
			color_rect = cfd_colors(data.CFD_score); 
		}
		//console.log(color_rect)
		return color_rect;
		});


//Modify svg properties according to sequence length and the lines height

svg.attr('height',(sequence_text.node().getBoundingClientRect().height*(line_length+2)));
		


		//#################### TABLE VIEW #####################33
		//Table view for the possible guides -created with jquery

		var table_div = d3.select('body').select('.table_div').select('.inner_content');

		var table = table_div.append('table').attr('class','guides_table').style('padding','1%'); 

		table.style("font-size",font_size.toString()+'px' );

		var header = table.append('tr');
		header.style('background-color',"#C0C0C0") //header
		var header_more_btn= header.append('th')
		.attr('width','7%'); //More buttons
		var header_guide_seq = header.append('th')
		.text("Guide Sequence")
		.attr('width','25%');
		


		var header_num_offtargets = header.append('th')
		.text("# off targets")
		.attr('width','13%');

		var header_mit_score = header.append('th')
		.text("MIT Score")
		.attr('width','30%'); 

		var header_cfd_score = header.append('th')
		.text("CFD Score")
		.attr('width','30%'); 


		//Adding row 
		console.log(guide_list);
		var i = -1; 
		var table_row = table.selectAll('tr.data')
		.data(guide_list)
		.enter()
		.append('tr')
		.attr('class',function(data){
			i +=1; 
			return "data " +i.toString(); 
		})
		.attr('height', "100px"); //Taaable row with no cells in it

		//Add More button

		var more_button = 
		table_row
		.append('th')
		.attr('height','40%')
		.append('input')
		.attr('id','more_button')
		.attr('type','image')
		.attr('src','/static/images/collapser_plus.png');



		//Button selection event listener

		//

		//Add guide sequence

		const guide_sequence_column = table_row.append('th').attr('padding','5px');
		const guide_sequence_column_svg = guide_sequence_column.append('svg').attr('height','100%').attr('width','100%');

		guide_sequence_column_svg.append('rect')
		.attr('y', '40%')
		.attr('x', 0)
		.attr('width','100%')
		.attr('height','25%')
		.attr('rx','10px')
		.attr('ry','10px')
		.attr('fill', function(data){
			var color_rect; 
			if (data.MIT_score <data.CFD_score){
				color_rect = mit_colors(data.MIT_score); 
			}else{
				color_rect = CFD_colors(data.CFD_score); 
			}
			console.log(color_rect)
			return color_rect;
		})
		.attr('fill-opacity','0.5');





		const sequence_text_poss_guide = guide_sequence_column_svg.append('text')
		.attr('x','5%')
		.attr('y','56.7%')
		.attr('textLength','90%')
		.attr('lengthAdjust',"spacingAndGlyphs")
		.text((dta)=>dta.sequence);




		//Add #off targets
		var off_targets_num = table_row.append('th');
		off_targets_num.append('svg').attr('height','100%').attr('width','100%').append('text').attr('y','56.7%').attr('x','50%').text((dta)=>dta.offtargets.length)
		;
		//Add MIT score

		//j = 0; 
		var mit_score= table_row.append('th'); 

		var mit_score_svg = mit_score.append('svg').attr('height','100%').attr('width','100%').attr('padding','10%');
		mit_score_svg.append('rect')
		.attr('y', '45%')
		.attr('x', '10%')
		.attr('width','80%')
		.attr('height','15%')
		.attr('rx','10px')
		.attr('ry','10px')
		.attr('fill',"#C9C9C9");

		mit_score_svg.append('rect')
		.attr('y', '45%')
		.attr('x', '10%')
		.attr('width',(dta)=> ((dta.MIT_score*80/100).toString())+'%')
		.attr('height','15%')
		.attr('rx','10px')
		.attr('ry','10px')
		.attr('fill', function(data){
			var color_rect = mit_colors(data.MIT_score); 
			return color_rect;
		});

		//Add MIT score

		//j = 0; 
		var cfd_score= table_row.append('th'); 

		var cfd_score_svg = cfd_score.append('svg').attr('height','100%').attr('width','100%').attr('padding',10);

		cfd_score_svg.append('rect')
		.attr('y', '45%')
		.attr('x', '10%')
		.attr('width','80%')
		.attr('height','15%')
		.attr('rx','10px')
		.attr('ry','10px')
		.attr('fill',"#C9C9C9");


		var k = 0; 
		cfd_score_svg.append('rect')
		.attr('y', '45%')
		.attr('x', '10%')
		.attr('width',(dta)=> ((dta.CFD_score*80/100).toString())+'%')
		.attr('height','15%')
		.attr('rx','10px')
		.attr('ry','10px')
		.attr('fill', function(data){
			console.log(k.toString()+" "+data.sequence);
			k+=1; 
			var color_rect = cfd_colors(data.CFD_score); 
			return color_rect;
		});
		cfd_score_svg.append('text').text((data)=>data.CFD_score); 

		//##### MODAL WINDOW -OffTarget view ######
		//Add modal window for each data (for now just sequence)


		var modal_window = d3.select('body').select('#myGuideModal');
		var modal_content = modal_window.select(".modal-content"); 
		var close_button = modal_content.selectAll(".close"); 

		more_button.on("click",function(d,e){

			
			console.log(e); 
			console.log(d);
			//Display modal window
			modal_window.style('display', 'block'); 
			
			//Append guide info 
			var guide_info_div = modal_content.append('div').attr('class','guide_info').style('flex','5'); 


            //General guide info
			var table_guide = guide_info_div.append('table').attr('class','guides_table').style('padding','1%').attr('height','20%'); 

			table_guide.style("font-size",font_size.toString()+'px');

			var header = table_guide.append('tr');
			header.style('background-color',"#C0C0C0"); //header
		
			var header_guide_seq = header.append('th')
			.text("Guide Sequence")
			.attr('width','30%');
			var header_num_offtargets = header.append('th')
			.text("# off targets")
			.attr('width','20%');
			var header_mit_score = header.append('th')
			.text("MIT Score")
			.attr('width','30%'); 
			var header_cfd_score = header.append('th')
			.text("CFD Score")
			.attr('width','30%'); 

			console.log(d)
			var table_row  = table_guide.append('tr')
			.attr('height','1%'); //Taaable row with no cells in it

		
			const guide_sequence_column_selected = table_row.append('th').attr('padding','5px');
			const guide_sequence_column_svg_selected  = guide_sequence_column_selected .append('svg').attr('height','100%').attr('width','100%');

			guide_sequence_column_svg_selected .append('rect')
			.attr('y', '40%')
			.attr('x', 0)
			.attr('width','100%')
			.attr('height','25%')
			.attr('rx','10px')
			.attr('ry','10px')
			.attr('fill', function(){
				var color_rect; 
				if (d.MIT_score <d.CFD_score){
					color_rect = mit_colors(d.MIT_score); 
				}else{
					color_rect = cfd_colors(d.CFD_score); 
				}
				console.log(color_rect)
				return color_rect;
			})
			.attr('fill-opacity','0.5');





			const sequence_text_poss_guide_selected  = guide_sequence_column_svg_selected.append('text')
			.attr('x','5%')
			.attr('y','56.7%')
			.attr('textLength','90%')
			.attr('lengthAdjust',"spacingAndGlyphs")
			.text(d.sequence);


			//Add  number of off targets
            var off_targets_num = table_row.append('th');
            off_targets_num.append('svg').attr('height','100%').attr('width','100%').append('text').attr('y','56.7%').attr('x','50%').text(d.offtargets.length); 
			//Add MIT score

			//j = 0; 
			var mit_score= table_row.append('th'); 

			var mit_score_svg = mit_score.append('svg').attr('height','100%').attr('width','100%').attr('padding','10%');
			mit_score_svg.append('rect')
			.attr('y', '45%')
			.attr('x', '10%')
			.attr('width','80%')
			.attr('height','15%')
			.attr('rx','10px')
			.attr('ry','10px')
			.attr('fill',"#C9C9C9");

			mit_score_svg.append('rect')
			.attr('y', '45%')
			.attr('x', '10%')
			.attr('width',(d.MIT_score*80/100).toString()+'%')
			.attr('height','15%')
			.attr('rx','10px')
			.attr('ry','10px')
			.attr('fill', function(){
				var color_rect = mit_colors(d.MIT_score); 
				return color_rect;
			});

			//Add MIT score

			//j = 0; 
			var cfd_score= table_row.append('th'); 

			var cfd_score_svg = cfd_score.append('svg').attr('height','100%').attr('width','100%').attr('padding',10);

			cfd_score_svg.append('rect')
			.attr('y', '45%')
			.attr('x', '10%')
			.attr('width','80%')
			.attr('height','15%')
			.attr('rx','10px')
			.attr('ry','10px')
			.attr('fill',"#C9C9C9");


			var k = 0; 
			cfd_score_svg.append('rect')
			.attr('y', '45%')
			.attr('x', '10%')
			.attr('width',(d.CFD_score*80/100).toString()+'%')
			.attr('height','15%')
			.attr('rx','10px')
			.attr('ry','10px')
			.attr('fill', function(){
				var color_rect = mit_colors(d.CFD_score); 
				return color_rect;
			});

			//Add off-targets view
			var off_target_div = modal_content.selectAll('div.off_target')
			.data(d.offtargets)
			.enter()
			.append('div')
			.attr('class','off_target border_rect_offtarget')
			.append('div')
			.attr('class','inner_content');

			//// Add the off target  text information id, scores
            const off_target_divider = off_target_div.append('hr').attr('class','off_target_header_gradient'); 

            const off_target_inner_text_info = off_target_div.append('div').attr('class','off_target_inner_text_info').style('display','flex').style('justify-content','center'); 

            //Reference genome id
            off_target_inner_text_info.append('div').attr('class', 'reference_genome_id').style('flex','40').append('h2').text((data)=>data.id); 
            // Score div
            const off_target_inner_score_info = off_target_inner_text_info.append('div').attr('class', 'score').style('flex','60'); 
            off_target_inner_score_info.append('div').attr('class', 'off_target_cfd_score').append('p').text(function(data){
                return "CFD score: "+data.CFD_score.toString()});
            off_target_inner_score_info.append('div').attr('class', 'off_target_mit_score').append('p').text(function(data){
                return "MIT score: "+data.MIT_score.toString()});
            //// Add the off target reference genome context
            const off_target_inner_ref_genome = off_target_div.append('div').attr('class','off_target_inner_ref_genome').style('display','flex').style('justify-content','center'); 
            const off_target_svg_ref_info = off_target_inner_ref_genome.append('svg'); 

            
            //Reference genome background color
            const grey_sequence_rect_off_target = off_target_svg_ref_info.append('rect').attr('class','sequence_gray_rect')
            .attr('border','2px')
            .attr('rx','5px')
            .attr('ry','5px')
            .attr("x", 0)
            .attr("y", 0)
            .attr("fill", "#C9C9C9");

            const highlight_seq_off_target = off_target_svg_ref_info.append('rect').attr('class','highlight_off_target')
            .attr('border','2px')
            .attr('rx','5px')
            .attr('ry','5px'); 

            //Input sequence text
            const ref_genome_text = off_target_svg_ref_info.append('text')
            .attr('x',0)
            .attr('font-size',font_size)
            .text((data)=>(data.ref_gen));
            //Set start according to font-size
            ref_genome_text.attr('y',ref_genome_text.node().getBoundingClientRect().height/1.3)

            off_target_svg_ref_info.attr('width',ref_genome_text.node().getBoundingClientRect().width);
            off_target_svg_ref_info.attr('height',(ref_genome_text.node().getBoundingClientRect().height*4));

            grey_sequence_rect_off_target.attr("height", ref_genome_text.node().getBoundingClientRect().height);
            grey_sequence_rect_off_target.attr("width", ref_genome_text.node().getBoundingClientRect().width);


            //Draw other rect to highlight the actual off-target
            highlight_seq_off_target
            .attr("x",(d)=>( ref_genome_text.node().getStartPositionOfChar(d.ref_gen_start).x))
            .attr("y", 0)
            .attr("fill", "#333198")
            .attr('opacity','0.5')
            .attr("width", function (d){
                console.log("start"+d.ref_gen_start); 
                console.log("end"+d.ref_gen_end); 

            return ref_genome_text.node().getStartPositionOfChar(d.ref_gen_end+1).x-ref_genome_text.node().getStartPositionOfChar(d.ref_gen_start).x});
            highlight_seq_off_target.attr("height", ref_genome_text.node().getBoundingClientRect().height);
            


            //Add lines to show start and end position
            off_target_svg_ref_info.append('rect').attr('class','vertical_marker')
            .attr('border','2px')
            .attr('x',function (d){return ref_genome_text.node().getStartPositionOfChar(d.ref_gen_start).x+0.5*(ref_genome_text.node().getStartPositionOfChar(d.ref_gen_start+1).x-ref_genome_text.node().getStartPositionOfChar(d.ref_gen_start).x)}) 
            .attr('y',(ref_genome_text.node().getBoundingClientRect().height*1.1))
            .attr('height','15px') 
            .attr('width','2px'); 

            off_target_svg_ref_info.append('rect').attr('class','vertical_marker')
            .attr('border','2px')
            .attr('x',function (d){return ref_genome_text.node().getStartPositionOfChar(d.ref_gen_end+1).x+0.5*(ref_genome_text.node().getStartPositionOfChar(d.ref_gen_end).x-ref_genome_text.node().getStartPositionOfChar(d.ref_gen_end+1).x)}) 
            .attr('y',(ref_genome_text.node().getBoundingClientRect().height*1.1))
            .attr('height','15px') 
            .attr('width','2px'); 
            
            //Add initial and final position
            off_target_svg_ref_info.append('text').attr('class','start_off_target')
            .attr('text-anchor','middle')
            .attr('x',function (d){return ref_genome_text.node().getStartPositionOfChar(d.ref_gen_start).x+0.5*(ref_genome_text.node().getStartPositionOfChar(d.ref_gen_start+1).x-ref_genome_text.node().getStartPositionOfChar(d.ref_gen_start).x)}) 
            .attr('y',(ref_genome_text.node().getBoundingClientRect().height*2.5))
            .text(function (d){return d.start})
            .attr('width','100%')
            .attr('height','100%');

            off_target_svg_ref_info.append('text').attr('class','end_off_target')
            .attr('text-anchor','middle')
            .attr('x',function (d){return ref_genome_text.node().getStartPositionOfChar(d.ref_gen_end+1).x+0.5*(ref_genome_text.node().getStartPositionOfChar(d.ref_gen_end).x-ref_genome_text.node().getStartPositionOfChar(d.ref_gen_end+1).x)}) 
            .attr('y',(ref_genome_text.node().getBoundingClientRect().height*2.5))
            .text(function (d){return d.end})
            .attr('width','100%')
            .attr('height','100%');


		});
		close_button.on("click",function(e,d){

			//Delete infooo
			modal_content.select('.guide_info').remove(); 
			modal_content.selectAll('.off_target.border_rect_offtarget').remove(); 

			//Hide modal window    
			modal_window.style('display', 'none'); 

		}); 
	

	


		//.......................Output view END.......................

		//show result sections
		
// $("#hide1").css("display","block");
/*
		//assign values to html variables
		$("#coverage_val").val(coverage);
		$("#seq_length").val(seq_length);
		$("#f_size").val(response.f_size);
		$("#n_mer").val(si_rna);
		$("#align_mm").val(response.missmatch);
		$("#best_start").val(best_start);
		$("#best_end").val(best_end);
		$("#cbr_start").val(best_start);
		$("#cbr_end").val(best_end);
		$("#best_score").val(best_score);
		$("#img_height").val(response.img_height);

		//set collapse and zoom buttons
		$("#collapse_btn").val(1);
		$("#collapse_btn").html("Expand Graph");
		$("#zoom").val(0);
		$("#zoom").html("Zoom In");

		createMap(1,0,score_array,expr_msg,ids,m_aoa);

		if (+best_seq.length > 10) {
			$("#best_seq").html("<b>>best_target_region_("+best_start+"-"+best_end+")</b><br />"+best_seq);
		} else {
			$("#best_seq").html("<b>No results were found</b>");
		}
		$("#query").html(seq);
		hilite_sequence(best_start,best_end,0);

		var desc="";
		var gene_name="";

		for (var i=0; i<ids.length; i=i+1) {
			if (ids[i][2].match(/Niben/)) {
				desc = ids[i][2].replace(/Niben\d+Scf[\:\.\d]+/,"");
				gene_name = ids[i][0];
			} else if (ids[i][0].match(/Solyc/)) {
				desc = ids[i][2].replace(/.+functional_description:/,"");
				desc = desc.replace(/\"/g,"");
				gene_name = ids[i][0].replace(/lcl\|/,"");
			} else {
				gene_name = ids[i][0];
				desc = ids[i][2];
			}
			t_info += "<tr><td>"+gene_name+"</td><td style='text-align:right;'>"+ids[i][1]+"</td><td>"+desc+"</td></tr>";
		}

		$("#target_info").html(t_info);
		// $("#hide2").css("display","");
		// $("#hide3").css("display","");
				

		$("#help_fsize").val(f_length);
		$("#help_mm").val(mm);
		*/

	}


	function createMap(collapsed,zoom,score_array,expr_msg,ids,m_aoa) {
		var img_height = +$("#img_height").val();
		var best_start = +$("#best_start").val();
		var best_end = +$("#best_end").val();
		var seq_length = +$("#seq_length").val();
		var img_width = 900;
		var xscale = +(img_width/seq_length); // to transform sequence length to pixels
		var vline_tag = 100;

		var c=document.getElementById("myCanvas");
		var ctx=c.getContext("2d");

		if (collapsed) {
			c.height = +(((ids.length)*35)+73);
			img_height = c.height;
		} else {
			c.height = +img_height;
		}
		if (seq_length < img_width || zoom) {
			xscale = 1;
			img_width = seq_length;
		}

		c.width = img_width;

		var cbr_start = +(best_start*xscale);
		var cbr_width = +((best_end-best_start)*xscale);

		//print black background
		ctx.beginPath();
		ctx.rect(0,(img_height-52),img_width,102);
		ctx.fillStyle='rgb(30,30,30)';
		ctx.fill();
		ctx.stroke();

		//print yellow rectangle for the best region
		ctx.beginPath();
		ctx.rect(cbr_start,0,cbr_width,img_height);
		ctx.strokeStyle='yellow';
		ctx.fillStyle='yellow';
		ctx.fill();
		ctx.stroke();

		//print the rectangles
		off_set_array = printSquares(collapsed,zoom,ids,m_aoa);

		//print vertical lines and tick values
		ctx.fillStyle='black';
		ctx.lineWidth=1;
		ctx.strokeStyle='rgb(200,200,200)';
		ctx.font="10px Arial";
		if (seq_length >=2700) {ctx.font="8px Arial";}
		if (seq_length >=4500) {ctx.font="6px Arial";}

		for (var l=100; l<seq_length; l+=100) {
			var i = l*xscale;
			ctx.beginPath();
			ctx.moveTo(i,15);
			ctx.lineTo(i,img_height);
			ctx.fillText(vline_tag,i-14,12);
			ctx.stroke();

			vline_tag+=100;
		}

		// print horizontal line under ticks
		ctx.beginPath();
		ctx.moveTo(0,20);
		ctx.lineTo(img_width,20);
		ctx.lineWidth=2;
		ctx.strokeStyle='#000000';
		ctx.stroke();

		//print subject names
		var ids_aoa = expr_msg; //aoa with subject ids
		for (var t=0; t<ids_aoa.length;t++) {
			ctx.beginPath();
			ctx.fillStyle='#000000';
			ctx.font="12px Arial";
			ctx.fillText(ids_aoa[t][0],5,off_set_array[t]+17);
			ctx.stroke();
		}
		printScoreGraph(collapsed,zoom,score_array,ids);
	}


	function printSquares(collapsed,zoom,ids,m_aoa) {
		var coverage = $("#coverage_val").val();
		var seq_length = $("#seq_length").val();

		var img_width = 900;
		var xscale = +(img_width/seq_length); // to transform sequence length to pixels
		var off_set = 20; //just under the horizontal line
		var coord_y = 0;

		var before_block = 20;
		var after_block = 10;

		if (collapsed) {
			before_block = 25;
		}
		if (seq_length < img_width || zoom) {
			xscale = 1;
			img_width = seq_length;
		}

		var off_set_array = []; //to print names

		var c=document.getElementById("myCanvas");
		var ctx=c.getContext("2d");

		ctx.lineWidth=1;

		// each track
		for (var t=0; t<ids.length;t++) {
			var max_row_num = 0; //to calculate the height of every track
			off_set_array.push(off_set);

			off_set += before_block; //add some space for the names

			//target and off-target colors
			if (t < coverage) {
				ctx.strokeStyle='rgb(0,0,180)';
				ctx.fillStyle='rgb(0,120,255)';
			} else {
				ctx.strokeStyle='rgb(150,0,0)';
				ctx.fillStyle='rgb(255,0,0)';
			}
			var row = 1;
			var prev_match_end = 9999;
			var prev_match_start = 0;
			var collapsed_start = 0;
			var collapsed_end = 0;

			//each match (rectangles)
			for (var i=0; i<m_aoa[t].length;i++) {

				var coord = m_aoa[t][i].split("-"); //array with start and end for every match
				m_width = +((+coord[1] - +coord[0] +1)*xscale); //rectangle width in pixels
				m_start = +(+coord[0]*xscale); //rectangle start in pixels

				//to allow as many rows as the n-mer size
				var match_distance = +(+coord[0] - +prev_match_start);
				if ((row < si_rna -1) && (coord[0] <= prev_match_end) && prev_match_end != 9999) {
					if ((match_distance > 1) && ((+row + match_distance) > si_rna)) {
						row = 1;
					} else {
						row++;
					}
				} else {
					row = 1;
				}

				if (!collapsed) {
					coord_y = off_set + row*4;

					//print rectangles
					ctx.beginPath();
					ctx.rect(m_start,coord_y,m_width,4);
					ctx.fill();
					ctx.stroke();
				} else {

					if (collapsed_start == 0) {
						collapsed_start = +coord[0];
					}
					if (+coord[0] < +prev_match_end) {
						collapsed_end = prev_match_end;
					} else {
						coord_y = off_set; //to collapse all rectangles of the track
						if (collapsed_end == 9999) {collapsed_end = prev_match_end;}
						var collapsed_width = (+collapsed_end - +collapsed_start + 1)*xscale;

						//print rectangles
						ctx.beginPath();
						ctx.rect(collapsed_start*xscale,coord_y,collapsed_width,4);
						ctx.fill();
						ctx.stroke();

						collapsed_start = coord[0];
						collapsed_end = coord[1];
					}
				}
				prev_match_end = +coord[1];
				prev_match_start = +coord[0];

				if (row > max_row_num) {max_row_num = row;} //get maximum number of rows per track to calculate the track height
			}

			if (!collapsed) {
				var track_height = (max_row_num*4)+after_block;
				off_set += track_height; //add space for next track
			} else {
				if (collapsed_end == 9999) {collapsed_end = prev_match_end;}
				coord_y = off_set; //to collapse all rectangles of the track
				var collapsed_width = (+collapsed_end - +collapsed_start + 1)*xscale;

				//print rectangles
				ctx.beginPath();
				ctx.rect(collapsed_start*xscale,coord_y,collapsed_width,4);
				ctx.fill();
				ctx.stroke();

				off_set += 10;
			}

			// print horizontal line under tracks
			ctx.beginPath();
			ctx.moveTo(0,off_set);
			ctx.lineTo(img_width,off_set);
			ctx.lineWidth=1;
			ctx.strokeStyle='rgb(200,200,200)';
			ctx.stroke();
		}
		return off_set_array;
	}


	//expand/collapse the n-mers graph when click on 'Collapse Graph' button
	$('#collapse_btn').click(function () {
		activateCollapse(score_array,best_seq,seq,expr_msg,ids,m_aoa);
	});

	//zoom in/out the n-mers graph when click on 'Zoom' button
	$('#zoom').click(function () {
		activateZoom(score_array,best_seq,seq,expr_msg,ids,m_aoa);
	});

	//display custom region selection rectangle when click on 'Set Custom Region' button
	$('#set_custom').click(function () {
		getCustomRegion(score_array,best_seq,seq);
	});

	$('#change_par').click(function () {
		res = changeTargets(bt2_file,score_array,seq,best_seq,expr_f,ids,m_aoa);
		score_array = res[0];
		seq = res[1];
		best_seq = res[2];
		expr_msg = res[3];
		ids = res[4];
		m_aoa = res[5];
	});

	$('#region_square').mouseup(function () {
		getSquareCoords(score_array,best_seq,seq);
	});

	$('#open_descriptions_dialog').click(function () {
		$('#dialog_info').replaceWith($('#target_info').clone());

		$('#desc_dialog').dialog({
			draggable:true,
			resizable:true,
			width:900,
			minWidth:400,
			maxHeight:400,
			closeOnEscape:true,
			title: "Gene Functional annotation",
		});
	});

  $('#parameters_button').click(function () {
    $('#params_dialog').modal();
    $('#parameter_list').html("<li class=\"list-group-item\"><b>Fragment size: </b>"+$("#help_fsize").val()+"</li>\
      <li class=\"list-group-item\"><b>n-mer: </b>"+$("#help_nmer").val()+"</li>\
      <li class=\"list-group-item\"><b>Mismatches: </b>"+$("#help_mm").val()+"</li>\
      <li class=\"list-group-item\"><b>Database: </b>"+$("#db_name").val()+"</li>");
  });


	$('#clear_form').click(function () {
		$("#sequence").val(null);
		$("#si_rna").val(21);
		$("#align_engine").val("Bowtie");
		$("#g_rna").val(null);
		$("#f_length").val(300);
		$("#mm").val(0);
		$("#expression_file").val(null);
	});


	function printScoreGraph(collapsed,zoom,score_array,ids) {
		var img_height = document.getElementById("img_height").value;
		var coverage = $("#coverage_val").val();
		var seq_length = $("#seq_length").val();

		var img_width = 900;
		var xscale = +(img_width/seq_length); // to transform sequence legth to pixels
		var img_h = +(img_height-52);

		if (collapsed) {
			img_h = +((ids.length*35)+21);
		}
		if (seq_length < img_width || zoom) {
			xscale = 1;
			img_width = seq_length;
		}

		var c=document.getElementById("myCanvas");
		var ctx=c.getContext("2d");

		//print black background
		ctx.beginPath();
		ctx.rect(0,img_h,img_width,52);
		ctx.globalAlpha = 0.7;
		ctx.fillStyle='rgb(30,30,30)';
		ctx.fill();
		ctx.stroke();
		ctx.globalAlpha = 1;

		//print x axis (green line)
		ctx.lineWidth=1;
		ctx.beginPath();
		ctx.strokeStyle='rgb(0,200,0)';
		ctx.moveTo(0,(img_h+26));
		ctx.lineTo(img_width,(img_h+26));
		ctx.stroke();

		if (score_array) {
			ctx.beginPath();
			ctx.moveTo(0,+img_h+25);
			ctx.strokeStyle='rgb(255,0,0)';

			for (var i=0; i<score_array.length; i++) {
				var xpos = (i+1)*xscale;
				var ypos = 0;

				// var final_score = (+score_array[i]/+si_rna/coverage*100).toFixed(2); //using coverage in algorithm
				var final_score = (+score_array[i]*100/coverage).toFixed(2);

				if (+final_score >= 0) {
					ypos = 25-(+final_score*25/100)+2;
				} else {
					ypos = 50-(+final_score*25/100);
				}
				if (ypos > 50) {
					ypos = 50;
				}
				ctx.lineTo(xpos,img_h+ypos);
				ctx.stroke();
			}
		}
	}


	// Highlights best region in Sequence Overview section
	function hilite_sequence(cbr_start,cbr_end,color) {

		if (color) {
			var markup = new Text.Markup( { 'highlight' : [ '<span class="highlighted2" style="background:#D2D4D6;">', '</span>' ], 'break' : [ '<br />', '' ], 'space' : [ '<span>&nbsp;</span>', '' ] });
		} else {
			var markup = new Text.Markup( { 'highlight' : [ '<span class="highlighted" style="background:yellow;">', '</span>' ], 'break' : [ '<br />', '' ], 'space' : [ '<span>&nbsp;</span>', '' ] });
		}

		var source_el = document.getElementById('query');
		var markup_el = document.getElementById('markup');

		var hilite_regions=[];

		if (cbr_end > 10) {
			cbr_start = cbr_start-1;
			if (cbr_start < 1) {
				cbr_start = 1;
			}
			hilite_regions.push(['highlight', cbr_start, cbr_end]);
		}

		var sequence = source_el.innerHTML;

		var break_regions = [];
		for (var i=0; i<sequence.length; i=i+60) {
			break_regions.push([ 'break', i, i ]);
		}

		var space_regions = [];
		for (var i =0; i<sequence.length; i=i+10) {
			space_regions.push(['space', i, i]);
		}

		var all_regions = break_regions.concat(hilite_regions, space_regions);
		var markedup_seq = markup.markup(all_regions, sequence);

		//insert line numbers
		var line_length = 60;
		var current_pos = 1;
		var lines = markedup_seq.split('<br />');
		var final_seq = '';
		var leading_spaces = new Array('', '', '', '', '', '');

		for (var i=1; i<lines.length; i++) {
			leading_str = leading_spaces.slice(0,Math.ceil(6-(Math.log(current_pos)/Math.log(10)))).join('&nbsp;'); // poor man's sprintf
			leading_str2 = leading_spaces.slice(0,Math.ceil(6-(Math.log(current_pos +line_length -1)/Math.log(10)))).join('&nbsp;');

			if (current_pos + line_length < sequence.length) {
				final_seq = final_seq + leading_str + current_pos +' '+ lines[i] +' '+ leading_str2 + ( current_pos + line_length - 1) +'<br />';
			} else {
				final_seq = final_seq + leading_str + current_pos + ' ' + lines[i] + ' ' + leading_str2 + sequence.length + '<br />';
			}

			current_pos += line_length;
		}

		markup_el.innerHTML='<font face="courier" size="2">'+final_seq+'</font>';
	}


	function activateCollapse(score_array,best_seq,seq,expr_msg,ids,m_aoa) {
		document.getElementById("region_square").style.height="0px";
		var collapsed = $("#collapse_btn").val();
		var zoom = $("#zoom").val();
		var seq_length = $("#seq_length").val();

		if (collapsed == 0) {
			$("#collapse_btn").html("Expand Graph");
			$("#collapse_btn").val(1);
			collapsed = 1;
		} else {
			$("#collapse_btn").html("Collapse Graph");
			$("#collapse_btn").val(0);
			collapsed = 0;
		}
		createMap(+collapsed,+zoom,score_array,expr_msg,ids,m_aoa);
		getCustomRegion(score_array,best_seq,seq);
	}

	function activateZoom(score_array,best_seq,seq,expr_msg,ids,m_aoa) {
		var collapsed = $("#collapse_btn").val();
		var zoom = $("#zoom").val();
		var seq_length = $("#seq_length").val();

		if (zoom == 0) {
			$("#zoom").html("Zoom Out");
			$("#zoom").val(1);
			zoom = 1;
		} else {
			$("#zoom").html("Zoom In");
			$("#zoom").val(0);
			zoom = 0;
		}
		createMap(+collapsed,+zoom,score_array,expr_msg,ids,m_aoa);
		getCustomRegion(score_array,best_seq,seq);
	}

	//Function to change values of custom region by dragging the selection square
	function getSquareCoords(score_array,best_seq,seq) {
		var img_width = 900;
		var seq_length = $("#seq_length").val();
		var zoom = $("#zoom").val();
		var rev_xscale = +(seq_length/img_width); // to transform sequence length to pixels
		$("#cbr_p").html("");

		if (+zoom || seq_length < img_width) {
			rev_xscale = 1;
			img_width = seq_length;
		}

		var r_left = document.getElementById("region_square").style.left;
		var r_width = document.getElementById("region_square").style.width;
		var left_num = r_left.replace("px","");
		var right_num = r_width.replace("px","");
		var sqr_left = Math.round(+left_num*rev_xscale);
		var sqr_right = Math.round((+left_num + +right_num)*rev_xscale);

		var cbr_start = (+sqr_left + 1);
		var cbr_end = (+sqr_right);
		var fragment = (+cbr_end - +cbr_start +1);

		if (+cbr_end > seq_length) {cbr_end = seq_length;}
		if (+cbr_start < 1) {cbr_start = 1;}

		$("#cbr_start").val(cbr_start);
		$("#cbr_end").val(cbr_end);
		$("#f_size").val(fragment);

		var best_region = [cbr_start,cbr_end];
		hilite_sequence(cbr_start,cbr_end,1);
		printCustomSeq(best_seq,seq);

		if (score_array) {
			printCustomScore(cbr_start,cbr_end,score_array);
		}
	}

	//Prints custom sequence in Best Region section
	function printCustomSeq(best_seq,seq) {
		var best_seq_el = document.getElementById("best_seq");
		var cbr_start = +$("#cbr_start").val();
		var cbr_end = +$("#cbr_end").val();
		var best_start = +$("#best_start").val();
		var best_end = +$("#best_end").val();

		best_seq_el.innerHTML = "<b>>custom_region_("+cbr_start+"-"+cbr_end+")</b><br />";

		for (var i=cbr_start; i<cbr_end; i=i+60) {
			if (cbr_end<i+61) {
				best_seq_el.innerHTML += seq.substring(i-1,cbr_end)+"<br />";
			} else {
				best_seq_el.innerHTML += seq.substring(i-1,i+59)+"<br />";
			}
		}
		best_seq_el.innerHTML += "<br /><b>>best_target_region_("+best_start+"-"+best_end+")</b><br />";
		best_seq_el.innerHTML += best_seq+"<br />";
	}


	// Prints Scores
	function printCustomScore(start,end,score_array){
		var custom_score = 0;
		var coverage = +$("#coverage_val").val();
		var seq_length = +$("#seq_length").val();
		var best_score = +$("#best_score").val();

		if (+end > seq_length) {end = seq_length;}
		if (+start < 1) {start = 1;}

		if (score_array) {
			for (var i= +start-1; i< +end; i++) {
				custom_score += +score_array[i];
			}
		}

		var fragment_length = (+end - +start + 1);

		if (coverage > 0 && fragment_length > 0) {
			var final_score = ((custom_score*100/fragment_length)/coverage).toFixed(2);
			// var final_score = (custom_score*100/+si_rna/fragment_length/coverage).toFixed(2); //using coverage
			$("#score_p").html("<b>Best target region score:</b> "+best_score+" &nbsp;&nbsp; <b> Custom region score: </b>"+final_score+" &nbsp;&nbsp; (-&infin;&mdash;100)");
		}
	}


	// Creates the draggable selection square and modifies custom region when push a button
	function getCustomRegion(score_array,best_seq,seq) {

		var cbr_start = +$("#cbr_start").val();
		var cbr_end = +$("#cbr_end").val();
		var map_el = document.getElementById('myCanvas');
		var seq_length = +$("#seq_length").val();

		var img_width = 900;
		var xscale = +(+img_width/+seq_length); // to transform sequence length to pixels

		var zoom = $("#zoom").val();

		if (zoom == 1 || seq_length < img_width) {
			xscale = 1;
			img_width = seq_length;
		}
		if (seq_length < img_width) {document.getElementById("seq_map").style.width=""+seq_length+"px";}


		if ((cbr_start > 0) && (cbr_end <= seq_length) && (cbr_end >= cbr_start+9)) {
			var cbr_left = Math.round((+cbr_start-1)*xscale);
			var cbr_width = ((+cbr_end - +cbr_start +1)*xscale);

			var cbr_height = (map_el.height - 21);

			//a border will add pixels to all end coordinates
			$("#region_square").css("border","0px solid #000000");
			$("#region_square").css("top","21px");
			$("#region_square").css("background","rgba(80,100,100,0.3)");
			$("#region_square").css("left",cbr_left+"px");
			$("#region_square").css("width",cbr_width+"px");
			$("#region_square").css("height",cbr_height+"px");

    	    $("#region_square").resizable({
				containment:map_el,
				handles: 'e, w',
				minWidth: 100*xscale,
			});

			$("#region_square").draggable({
				axis: 'x',
				containment:map_el,
				cursor: "move"
			});

			$("#cbr_p").html("");
			var fragment = (+cbr_end - +cbr_start +1);
			$("#f_size").val(fragment);

			hilite_sequence(cbr_start,cbr_end,1);


			printCustomSeq(best_seq,seq);

			if (score_array) {
				printCustomScore(cbr_start,cbr_end,score_array);
			}

		} else {
			$("#cbr_p").html("Values must be between 1 and "+seq_length+", getting a sequence not shorter than 10 bp!");
		}
	}


	function changeTargets(bt2_file,score_array,seq,best_seq,expr_f,ids,m_aoa) {

		var t_num = $("#t_num").val();
		var coverage = $("#coverage_val").val();
		var f_size = $("#f_size").val();
		var f_length = $("#f_length").val();
		var n_mer = $("#n_mer").val();
		si_rna = $("#si_rna").val();
		var align_mm = $("#align_mm").val();
		var mm = $("#mm").val();
		var db = $("#bt2_db").val();
		var expr_msg;
		var seq_length = $("#seq_length").val();

		if (n_mer != si_rna) {
			$("#f_length").val(f_size);
			$("#mm").val(align_mm);
			$("#si_rna").val(n_mer);
			si_rna = n_mer;
			$("#coverage_val").val(t_num);
			$("#region_square").css("height","0px");

			//check values before recalculate
			if (+n_mer >= 18 && +n_mer <= 30) {
				disable_ui();
				runBt2(n_mer, f_size, align_mm, db);
			} else {
				alert("n-mer value must be between 18-30");
			}
		} else if (align_mm != mm) {
			$("#f_length").val(f_size);
			$("#mm").val(align_mm);
			$("#coverage_val").val(t_num);

			// if (!align_mm || +align_mm < 0 || +align_mm > 1) {
			if (!align_mm || +align_mm < 0 || +align_mm > 2) {
				alert("miss-match value ("+align_mm+") must be between 0-2");
			} else {
				disable_ui();
				getResults(1, bt2_file, n_mer, f_size, align_mm, t_num, db, expr_f);
				$("#region_square").css("height","0px");
				//getCustomRegion(score_array,best_seq,seq)
			}
		} else if (t_num != coverage || f_size != f_length) {
			$("#f_length").val(f_size);
			$("#coverage_val").val(t_num);

			//check values before recalculate
			if (!f_size || +f_size < 10 || +f_size > +seq_length) {
				alert("Wrong fragment size ("+f_size+"), it must be 10 bp or higher, and lower than sequence length");
			} else {
				disable_ui();
				getResults(0, bt2_file, n_mer, f_size, align_mm, t_num, db, expr_f);
				$("#region_square").css("height","0px");
				//getCustomRegion(score_array,best_seq,seq)
			}
		} else {
			alert("there are no parameters to change");
		}
		return [score_array,seq,best_seq,expr_msg,ids,m_aoa]
	}

	function disable_ui() {
    jQuery('#myModal').modal({
        show: true,
        keyboard: false,
        backdrop: 'static'
      })
	}

	function enable_ui() {
    jQuery('#myModal').modal('hide');
	}

	function hide_ui() {
		$("#input_collapser").css("display","block");

    var img = document.getElementById('tmp_img_input');
    $('#input_view').collapse("hide");

    img.src = '/static/images/collapser_plus.png'

		$('#res_bar').css("display","block");
	}

});
