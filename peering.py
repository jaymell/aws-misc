import json
import boto3
import logging
import time
import pydash
import argparse

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)


def get_vpc_cidr(cli, vpc_id):
  ''' return cidr block of passed vpc id '''
  vpc_cidr = pydash.chain(cli.describe_vpcs()['Vpcs']) \
    .find(lambda it: it['VpcId'] == vpc_id) \
    .value()['CidrBlock']
  logging.debug("get_vpc_cidr -- vpc_cidr: %s" % vpc_cidr)
  return vpc_cidr


def get_routing_tables(cli, vpc_id):
  ''' given a client and vpc_id, get all routing table IDs '''
  routing_tables = pydash.chain(cli.describe_route_tables()['RouteTables']) \
    .filter(lambda it: it['VpcId'] == vpc_id ) \
    .map(lambda it: it['RouteTableId']) \
    .value()
  logging.debug("get_routing_tables: %s" % routing_tables)
  return routing_tables


def delete_route(cli, route_id, cidr):
  return cli.delete_route(RouteTableId=route_id, DestinationCidrBlock=cidr)


def create_route(cli, route_id, cidr, peering_id):
  ''' create route -- delete existing if one already exists '''
  try:
    cli.create_route(RouteTableId=route_id,
      DestinationCidrBlock=cidr,
      VpcPeeringConnectionId=peering_id)
  except Exception as e:
    if e.response['Error']['Code'] == 'RouteAlreadyExists':
      delete_route(cli, route_id, cidr)
      return create_route(cli, route_id, cidr, peering_id)
    else:
      raise e


def add_routes(cli, route_tables, cidr, vpc_peering_connection):
  ''' given array of route_tables, add cidr block to them '''

  return pydash.chain(route_tables) \
    .map(lambda it: create_route(cli, it, cidr, vpc_peering_connection)) \
    .value()


def update_vpc_routes(cli, vpc_id, cidr_other, vpc_peering_connection):
  route_tables = get_routing_tables(cli, vpc_id)
  add_routes(cli, route_tables, cidr_other, vpc_peering_connection)


def vpc_peer_request(cli, local_vpc, remote_vpc, remote_account=None):
  if remote_account is not None:
    return cli.create_vpc_peering_connection(VpcId=local_vpc,
        PeerVpcId=remote_vpc,
        PeerOwnerId=remote_account)
  else:
    return cli.create_vpc_peering_connection(VpcId=local_vpc,
        PeerVpcId=remote_vpc)


def accept_peer_request(cli, request_id):
  vpcauth = cli.VpcPeeringConnection(request_id)
  vpcauth.accept()
  return vpcauth


def get_role_credentials(cli, role):
  return cli.assume_role(
      RoleArn=role,
      RoleSessionName="RoleToAuthorizeVPCPeer"
    )['Credentials']


def get_clients(boto3, role_creds, region):
  ec2 = boto3.resource('ec2',
    aws_access_key_id = role_creds['AccessKeyId'],
    aws_secret_access_key = role_creds['SecretAccessKey'],
    aws_session_token = role_creds['SessionToken'],
    region_name=region
  )

  cli = boto3.client('ec2',
    aws_access_key_id = role_creds['AccessKeyId'],
    aws_secret_access_key = role_creds['SecretAccessKey'],
    aws_session_token = role_creds['SessionToken'],
    region_name=region
  )

  return (ec2, cli)


def do_stuff(local_vpc, remote_vpc, role, region):

  sts_client = boto3.client('sts', region_name=region)
  role_creds = get_role_credentials(sts_client, role)

  ec2, cli = get_clients(boto3, role_creds, region)

  vpc_request = vpc_peer_request(ec2, local_vpc, remote_vpc)
  vpc_auth = accept_peer_request(ec2, vpc_request.id)
  vpc_cidr = get_vpc_cidr(cli, local_vpc)
  other_vpc_cidr = get_vpc_cidr(cli, remote_vpc)
  update_vpc_routes(cli, local_vpc, other_vpc_cidr, vpc_request.vpc_peering_connection_id)
  update_vpc_routes(cli, remote_vpc, vpc_cidr, vpc_auth.vpc_peering_connection_id)


def main():
  argparser = argparse.ArgumentParser(description='Peer VPCs / update routing tables accordingly')
  argparser.add_argument("-r", "--role", required=True, help="optional role name to use")
  argparser.add_argument("-v", "--vpc", required=True, help="vpc id")
  argparser.add_argument("-p", "--remote-vpc", required=True, help="peer vpc id")
  argparser.add_argument("-e", "--region", required=True, help="region name")
  args = argparser.parse_args()

  do_stuff(args.vpc, args.remote_vpc, args.role, args.region)

if __name__ == '__main__':
  main()