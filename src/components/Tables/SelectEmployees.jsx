import { useMemo, useEffect, useContext, useRef, forwardRef } from 'react'
import { useTable, usePagination, useFilters, useRowSelect } from 'react-table'
import Image from 'next/image';
import Paginate from '@/components/Tables/utils/Paginate';
import AppContext from '@/AppContext';

// Define a default UI for filtering
function DefaultColumnFilter({
  column: { Header, filterValue, setFilter },
}) {
  return (
    <input
      className='border-0 rounded-lg focus:outline-none'
      value={filterValue || ''}
      onChange={e => {
        setFilter(e.target.value || undefined) // Set undefined to remove the filter entirely
      }}
      placeholder={`Search with ${Header.toLowerCase()}`}
    />
  )
}

// This is a custom filter UI for selecting
// a unique option from a list
function SelectColumnFilter({ 
    column: { Header, filterValue, setFilter, preFilteredRows, id } 
  }) {
  // Calculate the options for filtering
  // using the preFilteredRows
  const options = useMemo(() => {
    const options = new Set()
    preFilteredRows.forEach(row => {
      options.add(row.values[id])
    })
    return [...options.values()]
  }, [id, preFilteredRows])

  // Render a multi-select box
  return (
    <select
      className='focus:outline-none bg-[#F9FAFB] h-10 w-48 pl-3 border-r-8 border-transparent'
      value={filterValue}
      onChange={e => {
        setFilter(e.target.value || undefined)
      }}
    >
      <option value="">{Header}</option>
      {options.map((option, i) => (
        <option key={i} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

const IndeterminateCheckbox = forwardRef(
  ({ indeterminate, ...rest }, ref) => {
    const defaultRef = useRef()
    const resolvedRef = ref || defaultRef

    useEffect(() => {
      resolvedRef.current.indeterminate = indeterminate
    }, [resolvedRef, indeterminate])

    return (
      <div>
        <input type="checkbox" ref={resolvedRef} {...rest} />
      </div>
    )
  }
)

// Our table component
function Table({ columns, data }) {
  const { setSurveyFormData, setEmployeeMode } = useContext(AppContext);

  const filterTypes = useMemo(
    () => ({
      // Override the default text filter to use
      // "startWith"
      text: (rows, id, filterValue) => {
        return rows.filter(row => {
          const rowValue = row.values[id]
          return rowValue !== undefined
            ? String(rowValue)
                .toLowerCase()
                .startsWith(String(filterValue).toLowerCase())
            : true
        })
      },
    }),
    []
  )

  const defaultColumn = useMemo(
    () => ({
      // Let's set up our default Filter UI
      Filter: DefaultColumnFilter,
    }),
    []
  )

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page, 
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    filteredRows, 
    selectedFlatRows,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
      defaultColumn, // Be sure to pass the defaultColumn option
      filterTypes,
    },
    useFilters, // useFilters!
    usePagination,
    useRowSelect,
    hooks => {
      hooks.visibleColumns.push(columns => [
        // Let's make a column for selection
        {
          id: 'selection',
          // The header can use the table's getToggleAllRowsSelectedProps method
          // to render a checkbox
          Header: ({ getToggleAllPageRowsSelectedProps }) => (
            <div>
              <IndeterminateCheckbox {...getToggleAllPageRowsSelectedProps()} />
            </div>
          ),
          // The cell can use the individual row's getToggleRowSelectedProps method
          // to the render a checkbox
          Cell: ({ row }) => (
            <div>
              <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
            </div>
          ),
        },
        ...columns,
      ])
    }
  )

  // We don't want to render all of the rows for this example, so cap
  // it for this use case
  let SurveyName = headerGroups[0].headers[1];

  useEffect(() => {
    setPageSize(5);
  }, [])

  useEffect(() => {
    setSurveyFormData((prev) => {
      return {
        ...prev,
        people: selectedFlatRows.map((row) => row.original.id),
      }
    });
  }, [selectedFlatRows])

  return (
    <Paginate
      canPreviousPage={canPreviousPage}
      canNextPage={canNextPage}
      pageOptions={pageOptions}
      pageCount={pageCount}
      gotoPage={gotoPage}
      nextPage={nextPage}
      previousPage={previousPage}
      pageIndex={pageIndex}
      pageSize={pageSize}
      filteredRows={filteredRows}
    >
      <div className='w-full flex flex-col justify-between border-0 rounded-t-xl'>
        <div className='flex h-12 my-4 justify-between items-center'>
          <div className='ml-4 border border-gray-300 h-10 flex rounded-md'>
            <Image className='ml-4 mr-2'src='/search-icon.svg' width={13.5} height={13.5} />
            {SurveyName.canFilter ? SurveyName.render('Filter') : null}
          </div>
          <div className='mr-4'>
            <button 
                className='flex items-center justify-center gap-3 bg-button-blue text-white w-56 h-10 border-0 rounded-lg'
                onClick={() => setEmployeeMode('add_by_csv')}
              >
              <Image src='/plus-icon.svg' width={10} height={10} />
              Add Employee 
            </button>
          </div>
        </div>
        <table {...getTableProps()}>
          <thead>
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column, index) => (
                  <th {...column.getHeaderProps()}>
                    <div>
                      {
                        ( column.canFilter && index !== 1 ) 
                        ? 
                        column.render('Filter') 
                        : 
                        ( index === 1 )
                        ?
                        <div className='pl-4'>{column.render('Header')}</div>
                        :
                        column.render('Header')
                      }
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {page.map((row) => {
              prepareRow(row)
              return (
                <tr {...row.getRowProps()}>
                  {row.cells.map(cell => {
                    return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Paginate>
  )
}

function App() {
  const { employeeData } = useContext(AppContext);

  const columns = useMemo(
    () => [
            {
              Header: 'EMPLOYEE NAME',
              accessor: 'name',
              Cell: ({ value }) => <div className='pl-4'>{value}</div>,
            },
            {
              Header: 'TEAM',
              accessor: 'team_name',
              Filter: SelectColumnFilter,
              Cell: ({ value }) => <div className='pl-4'>{value}</div>,
            },
            {
              Header: 'DESIGNATION',
              accessor: 'position',
              Filter: SelectColumnFilter,
              Cell: ({ value }) => <div className='pl-4'>{value}</div>,
            },
            {
              Header: 'MANAGER',
              accessor: 'related_people.manager[0]',
              Filter: SelectColumnFilter,
              Cell: ({ value }) => <div className='pl-4'>{value}</div>,
            },
        ],
    []
  )

  return (
    <div className='h-full w-full pl-12 pr-12 mt-8'>
      <Table columns={columns} data={employeeData} />
    </div>
  )
}

export default App
