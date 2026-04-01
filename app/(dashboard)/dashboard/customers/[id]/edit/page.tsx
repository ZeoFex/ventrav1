import { CustomersEditView } from "@/app/components/dashboard/customers/customers-edit-view";


type Pageprops = {
    params:Promise<{id:string}>;
};

export default async function EditCustomerPage({params}:Pageprops){
    const {id} = await params
    return <CustomersEditView customerId={id} />
}