#User Access - Return true/false
package flow.rbac.useraccess
import rego.v1

default hasAccess := true


hasAccess if {
	#print("Input document:", input)
	print("vasu1")
	print("Input document:", input)
    some policy in data.policies
    print("vasu2")
    resource_matched(policy, input.resource, input.action)
    print("vasu3")
    user_role_matched(policy, input.user.roles)
    print("vasu4")
    
}

resource_matched(policy, resource, action) if{
	policy.resource.id == resource.id
    policy.action.type == action.type
}
    
user_role_matched(policy, userRoles) if {
	object.subset(sort(userRoles), sort(policy.roles))
}

