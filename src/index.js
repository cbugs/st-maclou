import React, { useEffect } from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types';
import BootstrapTable from 'react-bootstrap-table-next';
import filterFactory, { textFilter, dateFilter, Comparator, customFilter } from 'react-bootstrap-table2-filter';
import paginationFactory , { PaginationProvider, PaginationListStandalone } from 'react-bootstrap-table2-paginator';
import ToolkitProvider, { CSVExport } from 'react-bootstrap-table2-toolkit';

import { init, locations } from 'contentful-ui-extensions-sdk';
import { Button, Spinner, Dropdown, DropdownList, IconButton } from '@contentful/forma-36-react-components';
import {createClient} from 'contentful'
import '@contentful/forma-36-react-components/dist/styles.css';
import './index.css';

const headerSortingStyle = { backgroundColor: '#c8e6c9' };

const { ExportCSVButton } = CSVExport;

var client = createClient({
  accessToken: "u7rCwc1dyYc_OvBPVqXgv3irNjDeeeC_3Z9LVDc_wEk",
  space : 'r3ehowzhs9ex',
  environment:'staging'
});

function multiValuesFilter(filterVal,data,columnName){
	let filterValArr  = filterVal.split(",");
	let allValues = [];
	for(var fv of filterValArr){
		let values = data.filter(function(value){
			return fv.length>0 && value[columnName].toString().indexOf(fv)>=0;
		});
		allValues= [...new Set(allValues.concat(values))];
	}

	return allValues;
}

const columns = [
	{
		dataField: 'produit_nom',
		text: 'Nom',
		filter : textFilter({onFilter: function(filterVal,data){return multiValuesFilter(filterVal,data,'produit_nom')}}),
		hidden : false,
		sort: true,
		csvExport: true,
		headerSortingStyle
	}, 
	{
		dataField: 'produit_qct',
		text: 'QCT',
		filter: textFilter({onFilter: function(filterVal,data){return multiValuesFilter(filterVal,data,'produit_qct')}}),
		hidden : false,
		sort: true,
		csvExport: true,
		headerSortingStyle
	}, 
	{
		dataField: 'produit_meta_title',
		text: 'Meta Title',
		filter : textFilter({onFilter: function(filterVal,data){return multiValuesFilter(filterVal,data,'produit_meta_title')}}),
		hidden : false,
		sort : true,
		csvExport: true,
		headerSortingStyle
	},
	{
		dataField : 'produit_meta_desc',
		text: 'Meta Description',
		filter : textFilter({onFilter: function(filterVal,data){return multiValuesFilter(filterVal,data,'produit_meta_desc')}}),
		hidden : false,
		sort : true,
		csvExport: true,
		headerSortingStyle
	},
	{
		dataField : 'friendly_url',
		text: 'Friendly URL',
		filter : textFilter({onFilter: function(filterVal,data){return multiValuesFilter(filterVal,data,'friendly_url')}}),
		hidden : true,
		sort : true,
		csvExport: false,
		headerSortingStyle
	},
	{
		dataField : 'createdAt',
		text: 'CreatedAt',
		filter : dateFilter({ comparators: [Comparator.EQ, Comparator.GT, Comparator.LT] }),
		hidden : true,
		sort : true,
		csvExport: false,
		headerSortingStyle
	},
	{
		dataField : 'updatedAt',
		text: 'Updated At',
		filter : dateFilter({ comparators: [Comparator.EQ, Comparator.GT, Comparator.LT] }),
		hidden : true,
		sort : true,
		csvExport: false,
		headerSortingStyle
	}
];

class PageExtension extends React.Component {
	constructor(props) {
		super(props);
		this.state = { columns, dropdownOpen : false, tableResult : [], loading: true, progress: 0 }

		this.setOpen = this.setOpen.bind(this);
		this.retrieveEntries = this.retrieveEntries.bind(this);
	}

	entriesItemsLength = 0;
  	i = 0;

	componentDidMount() {
		this.retrieveEntries();
	}

	titleCase(str) {
		var splitStr = str.toLowerCase().split(' ');
	
		for (var i = 0; i < splitStr.length; i++) {
			splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
		}
	
		return splitStr.join(' ');
	}

	async retrieveEntries() {
		let properties = ['produit_famille', 'produit_images_page_detail', 'produit_images_push']
		while (true) {
			let entryList = [];
			await client.getEntries({
				content_type : 'produit_smc',
				skip : this.i,
				limit : 500,
				order : 'sys.createdAt'
			}).then((entries) => {
				this.entriesItemsLength = entries.items.length;
				entries.items.forEach(entry => {
					if (Object.entries(entry.fields).length !== 0) {
						entry.fields.createdAt = entry.sys.createdAt.substring(0, 10);
						entry.fields.updatedAt = entry.sys.updatedAt.substring(0, 10);

						for (let i = 0; i < properties.length; i++) {
							if (properties[i] in entry.fields) {
								delete entry.fields[properties[i]];
							}
						}
						entryList.push(entry.fields);
					}
				})
		
				this.setState( { tableResult : [...new Set(this.state.tableResult.concat(entryList))] } );
			})
			
			this.i += 500;

			
			// if (this.entriesItemsLength < 500) {
				break;
			// }
			let newProgress = (this.i/12000)*100;
			this.setState({progress: (newProgress>100?100:newProgress)})
		}
		
		for (let i = 0; i < this.state.tableResult.length; i++) {
			var flatten_results = this.flatten(this.state.tableResult[i]);
			for (let item in flatten_results) {
				if (item.includes("produit_fluxpdt.infos") || item.includes("produit_fluxprix.liste_prix")) {

					let val = item.split(".");
					val = val[val.length-1];

					if (columns.filter(e => e.dataField === val).length === 0) {
						let itemText = val.replace(/_/g, " ");
						let textValue = this.titleCase(itemText);
						columns.push({
							dataField : val,
							text : textValue,
							filter : textFilter({onFilter: function(filterVal,data){return multiValuesFilter(filterVal,data,val)}}),
							hidden : true,
							sort : true,
							csvExport : false,
							headerSortingStyle
						})
					}
					
					this.state.tableResult[i][val] = flatten_results[item];
				}
			}
		}
		this.setState({loading:false});
	}

	isPublished(entity) {
		return (!!entity.sys.publishedVersion && entity.sys.version === entity.sys.publishedVersion + 1);
	}
	  
	isChanged(entity) {
		return (!!entity.sys.publishedVersion && entity.sys.version >= entity.sys.publishedVersion + 2)
	}

	setOpen() {
		if (this.state.dropdownOpen) {
			this.setState({dropdownOpen : false})
		}
		else {
			this.setState({dropdownOpen : true})
		}
	}

	flatten = function (data) {
		const result = {};
	
		function recurse(cur, prop) {
			if (Object(cur) !== cur) {
				result[prop] = cur;
			} else if (Array.isArray(cur)) {
				let l = cur.length;
				for (let i = 0 ; i < l; i++)
				recurse(cur[i], prop + "." + i);
				if (l === 0) result[prop] = [];
			} else {
				let isEmpty = true;
				for (let p in cur) {
					isEmpty = false;
					recurse(cur[p], prop ? prop + "." + p : p);
				}
				if (isEmpty && prop) result[prop] = {};
			}
		}
		recurse(data, "");
		return result;
	};

	render = () => {
		const options = {
			custom: true,
			paginationSize: 5,
			pageStartIndex: 1,
			firstPageText: 'First',
			prePageText: 'Back',
			nextPageText: 'Next',
			lastPageText: 'Last',
			nextPageTitle: 'First page',
			prePageTitle: 'Pre page',
			firstPageTitle: 'Next page',
			lastPageTitle: 'Last page',
			showTotal: true,
			totalSize: this.state.tableResult.length
		};

		const CustomToggleList = ({
			onColumnToggle,
			toggles
		}) => (
			<div className = "dropdown-column">
				<Dropdown
					isOpen = {this.state.dropdownOpen}
					onClose = {() => this.setOpen(false)}
					toggleElement = {
					<IconButton label={""} size="large" buttonType="muted" onClick = {this.setOpen} iconProps={{icon:"Settings",size:"large"}}></IconButton>
					}
				>
				<DropdownList maxHeight={200}>
					<div className = "btn-group btn-group-toggle btn-group-vertical" data-toggle="buttons">
					{
						this.state.columns.map(column => ({
							...column,
							toggle : toggles[column.dataField]
					  	}))
					  	.map(column => (
							<button
								type = "button"
								key = {column.dataField}
								className={ `btn  ${column.toggle ? 'btn-success' : 'btn-default'}` }
								data-toggle = "button"
								onClick = { () => {
									onColumnToggle(column.dataField);
									let columnsCopy = this.state.columns;
									for (let i = 0; i < columnsCopy.length; i++) {
										if (column.dataField === columnsCopy[i].dataField) {
											if (columnsCopy[i].hidden === true) {
												columnsCopy[i].hidden = false;
												columnsCopy[i].csvExport = true;
											}
											else {
												columnsCopy[i].hidden = true;
												columnsCopy[i].csvExport = false;
											}
											break;
										}
									}
									this.setState( {columns : columnsCopy} )
								}
								}
							>
						  	{column.text}
							</button>
						))
					}
					</div>
				</DropdownList>
				</Dropdown>
			</div>
		);

		const contentTable = ({ paginationProps, paginationTableProps }) => (
			<div>
				<div>
					<div>
						<ToolkitProvider
							keyField="produit_qct"
							data={ this.state.tableResult }
							columns={ this.state.columns }
							columnToggle
							exportCSV = { {onlyExportFiltered: true, 
								exportAll: false, 
								fileName:"products.csv",
								noAutoBOM: false,
								blobType:"text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + 'ı,ü,ü,ğ,ş')
							} }
						>
						{
							props => (
								<div>
									<ExportCSVButton { ...props.csvProps }>Export CSV</ExportCSVButton>
									<hr/>
									<CustomToggleList { ...props.columnToggleProps } />
									<BootstrapTable
										{ ...props.baseProps }
										striped
										hover
										
										filter={ filterFactory() }
										{ ...paginationTableProps }
									/>
								</div>
							)
						}
						</ToolkitProvider>
					</div>
				</div>
				<PaginationListStandalone { ...paginationProps } />
			</div>
		);
		let renderPage = (
			<div>
				<h2 className="text-center">St-Maclou Products View</h2>
				<PaginationProvider
					pagination={
				  		paginationFactory(options)
					}
			  	>
					{ contentTable }
			  	</PaginationProvider>
			</div >
		);

		if(this.state.loading){
			renderPage = (
			<div className="text-center"><br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> 
			<Spinner
				size={'large'}
		  	/> 
			<br/>Fetching products...<br/> Please wait.... <br/> {parseInt(this.state.progress)} %
			</div>
			) ;
		}

		return (
			<div>
				{renderPage}
			</div>
		);
	};
}

PageExtension.propTypes = {
	sdk: PropTypes.object.isRequired
};

function SidebarExtension(props) {
	useEffect(() => {
		return props.sdk.window.startAutoResizer();
	}, [props.sdk]);

	return (
		<Button
			onClick={() => {
				props.sdk.navigator.openPageExtension({ path: '/' });
			}}>
			Open page extension
    </Button>
	);
}

SidebarExtension.propTypes = {
	sdk: PropTypes.object.isRequired
};

init(sdk => {
	if (sdk.location.is(locations.LOCATION_PAGE)) {
		render(<PageExtension sdk={sdk} />, document.getElementById('root'));
	} else if (sdk.location.is(locations.LOCATION_ENTRY_SIDEBAR)) {
		render(<SidebarExtension sdk={sdk} />, document.getElementById('root'));
	} else {
		return null;
	}
});
