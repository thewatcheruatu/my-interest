'use strict';

( function( $ ) {
	const MyInterest = ( function() {
		let $majorDesigneeSelect;
		let $myInterest;
		let $resultList;
		let impacts;

		function attachEventHandlers() {
			$majorDesigneeSelect.on( 'change', majorDesigneeChange );

			function majorDesigneeChange( e ) {
				e.preventDefault();

				const val = $( this ).val();
				console.log( val );
			}
		}

		function getData() {
			const url = 'http://gwalumni.org/projects/my-interest/index.php';

			return new Promise( ( resolve, reject ) => {
				$.ajax( {
					dataType : 'json',
					url : url,
				} )
				.done( ( _data ) => {
					resolve( _data );
				} )
				.fail( ( a, b, c ) => {
					reject( new Error( b ) );
				} )
			} );
		}

		function handleError( error ) {
			console.log( error.message );
		}

		function handleFatalError( error ) {
			$myInterest.html( '<h2>Could Not Load My Interest Data</h2>' );
		}

		function init() {
			$myInterest = $( '#my-interest' );
			getData()
				.then( ( _data ) => {
					make( _data );
					attachEventHandlers();
				} )
				.catch( handleFatalError );
		}

		function make( data ) {
			const majorDesignees = data.major_designees;

			_makeMajorDesigneesSelect();
			_makeResultList();
			$myInterest
				.append( $majorDesigneeSelect )
				.append( $resultList );

			function _makeMajorDesigneesSelect() {
				let html;

				html = '<select>\n<option>Please select a Designee</option>\n';
				for ( let i = 0; i < majorDesignees.length; i++ ) {
					let md = majorDesignees[i];
					html += 
						'<option value="' + md.major_designee_id + '">' +
						md.long_name + '</option>\n';
				}
				html += '</select>\n';
				$majorDesigneeSelect = $( html );
			}

			function _makeResultList() {
				$resultList = $(
					'<ul id="my-interest-results"></ul>'
				);
			}
		}

		return {
			init : init,
		}
	} )();
	MyInterest.init();
} )( jQuery );
