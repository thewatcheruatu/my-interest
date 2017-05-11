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

				getPowerAndPromiseId : function() {
					return 1001;
				},

				getMajor : function( majorDesigneeId ) {
					return majorDesignees[majorDesigneeId];
				},

				getSub : function( majorDesigneeId ) {
					const subs = dMap[majorDesigneeId];
					return subs.length ? subs[0] : null;
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
				 * These event handlers won't get attached until data has been retrieved
				 * and the application has been made.
				**/
				$amountSelect.on( 'change', _amountChange );
				$majorDesigneeSelect.on( 'change', _majorDesigneeChange );
				/*
				 * On document ready, check the query string for pre-population purposes.
				**/
				$( () => {
					const qs = _queryStringGetParams( 'majorDesignee' );

					if ( ! Object.keys( qs ).length ) {
						setAmountSelect( '25' );
					} else {
						// Potentially triggering two repaints here, but NBD I guess.
						if ( qs.majorDesignee ) {
							setMajorDesigneeSelect( qs.majorDesignee );
						}
						if ( qs.amount ) {
							setAmountSelect( qs.amount );
						}
					}

					function _queryStringGetParams( paramName ) {
						const qs = location.search.replace( /^\?/, '' ).split( '&' );
						const params = qs.reduce( ( a, c ) => {
							const param = c.split( '=' );
							if ( param.length > 1 ) {
								a[param[0]] = param[1];
							}
							return a;
						}, {} );

						return params;
					}
				} );

				function _amountChange( e ) {
					e.preventDefault();
					_updateImpactsList();
				}

				function _majorDesigneeChange( e ) {
					e.preventDefault();
					_updateImpactsList();
				}

				function _updateImpactsList() {
					const amount = $amountSelect.val();
					const majorDesigneeId = $majorDesigneeSelect.val();
					const filters = {};
					let html;

					if ( majorDesigneeId !== '' ) {
						filters.majorDesigneeId = parseInt( majorDesigneeId, 10 );
					}
					if ( amount !== '' ) {
						filters.amount = parseInt( amount, 10 );
					}

					const filteredImpacts = Impacts.get( filters );

					if ( ! filteredImpacts.length ) {
						html = _makeGenericResultHtml();
					} else {
						html = filteredImpacts.reduce( ( a, c ) => {
							return a + _makeImpactResultHtml( c );
						}, '' );
					}

					$resultList.html( html );

					function _makeGenericResultHtml() {
						const genericImpact = {
							amount : filters.amount || 25,
							description : 'Provides unrestricted support for GW students and faculty.',
							major_designee_id : filters.majorDesigneeId || null,
						};

						if ( filters.majorDesigneeId ) {
							genericImpact.designee_id = Designees.getSub( filters.majorDesigneeId );
						}

						console.log( genericImpact );

						return _makeImpactResultHtml( genericImpact );
					}

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
						const linkLabel = 'Give to ' + 
							( majorDesignee ? majorDesignee.short_name : 'GW' );

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
				$myInterest.html(
					'<p id="app-loading-message" class="error">We\'re sorry. ' +
					'Something went wrong while attempting to load application.</p>'
				);
			}

			function init() {
				$myInterest = $( '#my-interest' );
				$myInterest.html(
					'<p id="app-loading-message">Loading...</p>'
				);
				getData()
					.then( ( _data ) => {
						$myInterest.html( '' );
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
				$( 
					'<p><label class="my-interest-filter">I want to support: \n' +
					'</label></p>' 
				)
					.append( $majorDesigneeSelect )
					.appendTo( $myInterest );

				$( 
					'<p><label class="my-interest-filter">I want to give: \n' +
					'</label></p>' 
				)
					.append( $amountSelect )
					.appendTo( $myInterest );

				$myInterest.append( $resultList );

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
						'</select>\n</label></p>\n';

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
							'<option value="' + md.major_designee_id + '" ' +
							'data-short-name="' + md.short_name.replace( /['\s]/g, '').toLowerCase() + '">' +
							md.long_name + '</option>\n';
					}
					html += '</select>\n</label></p>\n';
					$majorDesigneeSelect = $( html );
				}

				function _makeResultList() {
					$resultList = $(
						'<ul id="impact-results"></ul>'
					);
				}

			}

			function setAmountSelect( amount ) {
				amount = amount.replace( '$', '' );
				if ( 
					$amountSelect
						.find( 'option[value=' + amount + ']' ).length ) {
					$amountSelect.val( amount ).trigger( 'change' );
				}
			}

			function setMajorDesigneeSelect( majorDesignee ) {
				/*
				 * majorDesignee might be the numeric ID or the short name
				**/
				if ( /^\d+$/.test( majorDesignee ) ) {
					// Numeric ID
					if ( 
						$majorDesigneeSelect
							.find( 'option[value=' + majorDesignee + ']' )
							.length 
					) {
						$majorDesigneeSelect.val( majorDesignee ).trigger( 'change' );
					}
				} else {
					// Short name
					majorDesignee = majorDesignee.toLowerCase().replace( /[\+\s']/g, '' );
					const mdOption = $majorDesigneeSelect
						.find( 'option[data-short-name=' + majorDesignee + ']' );
					if ( mdOption.length ) {
						$majorDesigneeSelect
							.val( mdOption.attr( 'value' ) )
							.trigger( 'change' );
					}
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
