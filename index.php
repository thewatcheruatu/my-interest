<?php

/*
 * TODO - Get rid of this as soon as you can
 * Silently trap errors/warnings in the meantime
**/
function my_error_handler( $errorno, $errstr, $errfile, $errline ) {
	//echo $errstr, '<br>';
}

function main() {
	try {
		include 'config.php';
	} catch( ErrorException $e ) {
		return MyInterestResponse::error();
	}
	$database = Config::get( 'database' );
	$dbname = $database['dbname'];
	$username = $database['username'];
	$password = $database['password'];
	$db = new Database( $dbname, $username, $password );

	if ( ! $db->is_connected() ) {
		return MyInterestResponse::error();
	}

	MyInterest::get_major_designees( $db );
	MyInterest::get_designees( $db );
	MyInterest::get_impacts( $db );
	MyInterestResponse::send();
}

main();

class Database {
	private $dbh;

	public function __construct( $dbname, $username, $password ) {
		try {
			$this->dbh = new PDO(
				"mysql:host=localhost;dbname={$dbname};charset=utf8",
				$username,
				$password
			);
		} catch( PDOException $e ) {
			ErrorLog::add( $e->getMessage() );
		}
	}

	public function is_connected() {
		return $this->dbh ? true : false;
	}

	public function query( $query ) {
		$sth = $this->dbh->query( $query );

		$sth->setFetchMode( PDO::FETCH_ASSOC );
		return $sth;
	}
}

class ErrorLog {
	private static $log = array();

	static function add( $message ) {
		array_push( self::$log, $message );
	}

	static function get_last() {
		$loglength = count( self::$log );

		return $loglength ? self::$log[$loglength-1] : null;
	}
}

class MyInterestResponse {
	public static $designees = array();
	public static $impacts = array();
	public static $major_designees = array();

	public static function error() {
		//http_response_code( 500 );
		header( 'HTTP/1.1 500 Internal Server Error' );
	}

	public static function send() {
		$response = array(
			'designees' => self::$designees,
			'impacts' => self::$impacts,
			'major_designees' => self::$major_designees,
		);

		/*
		 * JSON encoding the response is going to throw some warnings about some of
		 * the descriptions not being UTF-8, because of curly apostrophes, etc.
		 * TODO - fix this later
		**/
		set_error_handler( my_error_handler );

		header('content-type: application/json; charset=utf-8');
		if ( isset( $_GET['callback'] ) ) {
			echo $_GET['callback'] . '(' . json_encode( $response ). ')';
		} else {
			echo json_encode( $response );
		}
		
	}
}

class MyInterest {

	public static function get_designees( $db ) {
		$query = 'select * from designees order by designee_name asc';
		$sth = $db->query( $query );
		while ( $result = $sth->fetch() ) {
			array_push(
				MyInterestResponse::$designees,
				array(
					'designee_id' => ( int ) $result['designee_id'],
					'major_designee_id' => ( int ) $result['major_designee_id'],
					'designee_name' => $result['designee_name']
				)
			);
		}
	}

	public static function get_impacts( $db ) {
		$query = 'select * from impacts where not suppress;';
		$sth = $db->query( $query );
		while ( $result = $sth->fetch() ) {
			array_push(
				MyInterestResponse::$impacts,
				array(
					'impact_id' => ( int ) $result['impact_id'],
					'designee_id' => ( int ) $result['designee_id'],
					'amount' => ( int ) $result['amount'],
					'description' => utf8_encode( $result['description'] ),
					'area_of_support' => $result['area_of_support']
				)
			);
		}
	}

	public static function get_major_designees( $db ) {
		$query = 'SELECT * FROM major_designees ORDER BY long_name ASC';
		$sth = $db->query( $query );
		while ( $result = $sth->fetch() ) {
			array_push(
				MyInterestResponse::$major_designees,
				array(
					'major_designee_id' => ( int ) $result['major_designee_id'],
					'short_name' => $result['short_name'],
					'long_name' => $result['long_name']
				)
			);
		}
	}

}

?>
