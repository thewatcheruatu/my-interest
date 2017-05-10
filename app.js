'use strict';

( function( $ ) {
	const MyInterest = ( function() {

		const Designees = ( () => {
			let majorDesignees = {};
			let designees = {};
			let dMap = {};

			return {
				get : function( designeeId ) {
					return designees[designeeId];
				},

				getMajor : function( majorDesigneeId ) {
					return majorDesignees[majorDesigneeId];
				},

				set : function( data ) {
					for ( let i = 0; i < data.majorDesignees.length; i++ ) {
						const md = data.majorDesignees[i];
						majorDesignees[md.major_designee_id] = md;
					}

					for ( let i = 0; i < data.designees.length; i++ ) {
						const d = data.designees[i];
						designees[d.designee_id] = d;
					}

					for ( let i = 0; i < data.designees.length; i++ ) {
						const d = data.designees[i];
						const designeeId = d.designee_id;
						const majorDesigneeId = d.major_designee_id;

						if ( ! dMap[majorDesigneeId] ) {
							dMap[majorDesigneeId] = [];
						}
						dMap[majorDesigneeId].push( designeeId );
					}
				},
			};
		} )();

		const Impacts = ( () => {
			let master = [];
			let majorToDesignees;

			function filter( filters ) {
				let filteredImpacts = [];

				if ( ! Object.keys( filters ).length ) {
					return master;
				}

				for ( let i = 0; i < master.length; i++ ) {
					let include = true;
					if ( filters.majorDesigneeId ) {
						include = include && filters.majorDesigneeId === master[i].major_designee_id;
					} 
					if ( filters.amount ) {
						include = include && filters.amount === master[i].amount;
					}
					if ( include ) {
						filteredImpacts.push( master[i] );
					}
				}

				return filteredImpacts;
			}

			return {
				get : function( filters ) {
					filters = filters || {};
					return filter( filters );
				},

				set : function( data ) {
					const impacts = data.impacts;

					master = _processImpacts();

					function _processImpacts() {
						for ( let j = 0; j < impacts.length; j++ ) {
							const designee = Designees.get( impacts[j].designee_id );
							impacts[j].major_designee_id = designee.major_designee_id;
						}

						return impacts;
					}
				},
			};
		} )();

		const App = ( () => {

			let $amountSelect;
			let $majorDesigneeSelect;
			let $myInterest;
			let $resultList;

			function attachEventHandlers() {
				/*
				 * Want to update the impact list on document.ready.
				 * These event handlers won't get attached until data has been retrieved
				 * and the application has been made.
				**/
				$( updateImpactsList );
				/*
				 * These two handlers are the same. Don't think they'll ever have to
				 * be different, but I kept them separate just in case.
				*/
				$amountSelect.on( 'change', amountChange );
				$majorDesigneeSelect.on( 'change', majorDesigneeChange );

				function amountChange( e ) {
					e.preventDefault();
					updateImpactsList();
				}

				function majorDesigneeChange( e ) {
					e.preventDefault();
					updateImpactsList();
				}

				function updateImpactsList() {
					const amount = $amountSelect.val();
					const majorDesigneeId = $majorDesigneeSelect.val();
					const filters = {};

					if ( majorDesigneeId !== '' ) {
						filters.majorDesigneeId = parseInt( majorDesigneeId, 10 );
					}
					if ( amount !== '' ) {
						filters.amount = parseInt( amount, 10 );
					}

					const filteredImpacts = Impacts.get( filters );
					if ( ! filteredImpacts.length ) {
						$resultList.html( '' );
						return;
					}
					const html = filteredImpacts.reduce( ( a, c ) => {
						return a + _makeImpactResultHtml( c );
					}, '' );
					$resultList.html( html );

					function _makeImpactResultHtml( impact ) {
						const majorDesignee = Designees.getMajor( impact.major_designee_id );
						const donationLevels = {
							'25' : '1806',
							'50' : '1803',
							'100' : '1804',
							'250' : '1805',
							'500' : '1807',
							'1000' : '1808',
							'2500' : '1809',
							'5000' : '1810',
						};
						const url = 
							'https://secure2.convio.net/gwu/site/Donation2?df_id=1382&' +
							'1382.donation=form1&set.SingleDesignee=' + impact.designee_id + 
							'&set.DonationLevel=' + donationLevels[impact.amount] +
							( impact.amount === 25 ? '&set.Value=2500' : '' );
						const linkLabel = 'Give to ' + majorDesignee.short_name;

						return '<li><span class="impact-description">' + impact.description + 
							' </span><a class="impact-give-link" href="' + url + '">' +
							'<span class="impact-give-link-label">' + linkLabel + '</span>' +
							'<span class="impact-give-link-amount"> $' + impact.amount + '</span></a>' +
							'</li>';
					}
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
				console.log( 'error', error );
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
				const designees = data.designees;
				const impacts = data.impacts;

				// This is defined at the top level
				Designees.set( {
					majorDesignees : majorDesignees,
					designees : designees,
				} );

				Impacts.set( {
					impacts : impacts,
				} );

				_makeMajorDesigneesSelect();
				_makeAmountSelect();
				_makeResultList();
				$myInterest
					.append( $majorDesigneeSelect )
					.append( $amountSelect )
					.append( $resultList );

				function _makeAmountSelect() {
					let html;

					html = '<select>\n<option>Please select an Amount</option>\n' +
						'<option value="25">$25</option>\n' +
						'<option value="50">$50</option>\n' +
						'<option value="100">$100</option>\n' +
						'<option value="250">$250</option>\n' +
						'<option value="500">$500</option>\n' +
						'<option value="1000">$1000</option>\n' +
						'<option value="2500">$2500</option>\n' +
						'<option value="5000">$5000</option>\n' +
						'</select>\n';

					$amountSelect = $( html );
				}

				function _makeMajorDesigneesSelect() {
					let html;

					html = '<select>\n<option>Please select a Designee</option>\n';
					for ( let i = 0; i < majorDesignees.length; i++ ) {
						let md = majorDesignees[i];
						
						// Ensure there are actually impacts for this major designee
						if ( ! Impacts.get( { majorDesigneeId : md.major_designee_id } ).length ) {
							continue;
						}
						html += 
							'<option value="' + md.major_designee_id + '">' +
							md.long_name + '</option>\n';
					}
					html += '</select>\n';
					$majorDesigneeSelect = $( html );
				}

				function _makeResultList() {
					$resultList = $(
						'<ul id="impact-results"></ul>'
					);
				}

			}

			return {
				init : init,
			};
		} )();

		return {
			init : App.init,
		};
	} )();
	

	MyInterest.init();
} )( jQuery );
